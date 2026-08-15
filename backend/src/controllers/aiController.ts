import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

/**
 * Exécute l'analyse Vision multi-fournisseurs avec la séquence de fallback :
 * a) Gemini generateContent v1beta : gemini-flash-latest -> gemini-3.5-flash -> gemini-3.7-flash
 * b) Cloudflare llama-4-scout via chat/completions
 * c) Cloudflare llama-4-scout via /ai/run
 */
export async function callVision(prompt: string, base64image: string): Promise<{ modelName: string; data: any; rawText: string }> {
  const geminiApiKey = process.env.GEMINI_API_KEY || (env as any).GEMINI_API_KEY || '';
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

  const attempts: { name: string; fn: () => Promise<{ status: number; text: string }> }[] = [];

  // a) Gemini generateContent v1beta (inline_data)
  const geminiModels = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.7-flash'];
  if (geminiApiKey) {
    for (const model of geminiModels) {
      attempts.push({
        name: `Gemini (${model})`,
        fn: async () => {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: 'image/jpeg',
                        data: base64image,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
              },
            }),
          });
          const text = await resp.text();
          if (!resp.ok) return { status: resp.status, text };

          const jsonRes = JSON.parse(text);
          const rawText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return { status: resp.status, text: rawText };
        },
      });
    }
  }

  // b) Cloudflare llama-4-scout via chat/completions
  if (accountId && apiToken) {
    attempts.push({
      name: 'Cloudflare (llama-4-scout chat/completions)',
      fn: async () => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: '@cf/meta/llama-4-scout-17b-16e-instruct',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64image}` } },
                ],
              },
            ],
            max_tokens: 4096,
          }),
        });
        const text = await resp.text();
        if (!resp.ok) return { status: resp.status, text };

        const jsonRes = JSON.parse(text);
        const rawText =
          jsonRes.result?.choices?.[0]?.message?.content ||
          jsonRes.choices?.[0]?.message?.content ||
          '';
        return { status: resp.status, text: rawText };
      },
    });

    // c) Cloudflare llama-4-scout via /ai/run
    attempts.push({
      name: 'Cloudflare (llama-4-scout /ai/run)',
      fn: async () => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            image: base64image,
            max_tokens: 4096,
          }),
        });
        const text = await resp.text();
        if (!resp.ok) return { status: resp.status, text };

        const jsonRes = JSON.parse(text);
        const rawText =
          jsonRes.result?.response ||
          jsonRes.result?.description ||
          jsonRes.result?.text ||
          '';
        return { status: resp.status, text: rawText };
      },
    });
  }

  for (const attempt of attempts) {
    try {
      console.log(`[Vision] essai ${attempt.name}...`);
      const { status, text } = await attempt.fn();
      console.log(`[Vision] essai ${attempt.name} -> status ${status}`);

      if (status === 200 && text) {
        const cleanedText = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        let structuredData: any = null;
        try {
          structuredData = JSON.parse(cleanedText);
        } catch (_parseErr) {
          const jsonMatch = cleanedText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              structuredData = JSON.parse(jsonMatch[0]);
            } catch (_innerErr) {}
          }
        }

        const serialized = JSON.stringify(structuredData || '').toLowerCase();
        const hasKeyword = serialized.includes('codeue') || serialized.includes('mif') || serialized.includes('intitule');

        if (structuredData && hasKeyword) {
          console.log(`[Vision] Succès avec ${attempt.name}!`);
          return { modelName: attempt.name, data: structuredData, rawText: cleanedText };
        }
      }
    } catch (err: any) {
      console.error(`[Vision] Erreur lors de l'essai ${attempt.name}:`, err?.message || err);
    }
  }

  throw ApiError.badGateway('Tous les modèles de Vision (Gemini + Cloudflare) ont échoué.', 'ALL_VISION_MODELS_FAILED');
}

/**
 * Endpoint POST /api/v1/ai/extract-maquette
 */
export async function extractMaquette(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw ApiError.badRequest('Aucune image fournie.', 'MISSING_IMAGE');
    }

    const base64image = files[0].buffer.toString('base64');
    const prompt = `Extract this academic curriculum table into JSON: array of objects with keys semestre, codeUE, intituleUE, codeECUE, intituleECUE, ects, enseignant. One object per ECUE row. Return ONLY valid JSON, no markdown.`;

    const { modelName, data } = await callVision(prompt, base64image);

    const defaultHeader = ["Semestre", "Code UE", "Intitulé UE", "Code ECUE", "Intitulé ECUE", "ECTS", "Enseignant"];

    let rows: string[][] = [];
    if (Array.isArray(data)) {
      rows = data.map((item: any) => [
        String(item.semestre || item.Semester || ''),
        String(item.codeUE || item.CodeUE || ''),
        String(item.intituleUE || item.IntituleUE || ''),
        String(item.codeECUE || item.CodeECUE || ''),
        String(item.intituleECUE || item.IntituleECUE || ''),
        String(item.ects || item.ECTS || ''),
        String(item.enseignant || item.Enseignant || ''),
      ]);
    } else if (data && Array.isArray(data.rows)) {
      rows = data.rows;
    }

    const firstRowStr = (rows[0] || []).join(' ').toLowerCase();
    const hasHeaderKeywords = ['code', 'intitule', 'ue', 'semestre', 'ecue'].some((kw) => firstRowStr.includes(kw));

    if (!hasHeaderKeywords) {
      rows.unshift(defaultHeader);
    }

    sendSuccess(res, { modelUsed: modelName, rows }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint POST /api/v1/ai/extract-timetable
 */
export async function extractTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw ApiError.badRequest('Aucune image fournie.', 'MISSING_IMAGE');
    }

    const base64image = files[0].buffer.toString('base64');
    const prompt = `Extract this timetable table into JSON: array of objects with keys jour, startTime, endTime, matiere, salle, enseignant, groupe, type. One object per session. Return ONLY valid JSON, no markdown.`;

    const { modelName, data } = await callVision(prompt, base64image);
    sendSuccess(res, { modelUsed: modelName, sessions: data }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint POST /api/v1/ai/structure
 */
export async function structureTextWithAi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text, kind } = req.body;
    if (!text || typeof text !== 'string') {
      throw ApiError.badRequest('Le texte brut OCR (text) est requis.', 'MISSING_TEXT');
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

    if (!accountId || !apiToken) {
      throw ApiError.badGateway('Variables CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN non configurées.', 'NO_CLOUDFLARE_KEY');
    }

    let prompt = '';
    if (kind === 'timetable') {
      prompt = `Tu es un assistant d'extraction d'emploi du temps universitaire. Voici le texte brut extrait par OCR. Réponds EXCLUSIVEMENT par un tableau JSON d'objets strict (sans explications, sans markdown).
Format JSON strict :
[
  { "jour": "lundi", "startTime": "08:00", "endTime": "10:00", "matiere": "nom", "salle": "salle", "enseignant": "nom", "groupe": "groupe", "type": "CM" }
]
Corrige les fautes d'orthographe et mots déformés par le sens. Un objet par séance.`;
    } else {
      prompt = `Tu es un assistant d'extraction de maquette académique. Voici le texte brut extrait par OCR d'une maquette. Réponds EXCLUSIVEMENT par un tableau JSON d'objets strict (sans explications, sans markdown).
Format JSON strict :
[
  { "semestre": 1, "codeUE": "MIF4116", "intituleUE": "Microéconomie Financière 1", "codeECUE": "MIF41151", "intituleECUE": "Décision dans l'Incertain", "ects": "24", "enseignant": "" }
]
Corrige les fautes d'orthographe et mots déformés par le sens (ex: 'Macoscommoie'→'Macroéconomie'). Un objet par ligne ECUE.`;
    }

    const truncatedText = text.slice(0, 12000);
    const fullPrompt = `${prompt}\n\nTEXTE BRUT OCR :\n${truncatedText}`;

    console.log(`[Cloudflare AI] Structure de texte (${kind || 'maquette'})...`);

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Cloudflare Text API Error ${response.status}]`, errText);
      throw ApiError.badGateway(`Erreur Cloudflare AI (${response.status}) : ${errText}`, 'CLOUDFLARE_ERROR');
    }

    const result = (await response.json()) as any;
    const rawText =
      result.result?.response ||
      result.result?.description ||
      result.result?.text ||
      (Array.isArray(result.result?.choices) ? result.result.choices[0]?.text : '');

    if (!rawText) {
      throw ApiError.badGateway('Aucune réponse générée par Cloudflare AI.', 'EMPTY_AI_RESPONSE');
    }

    const cleanedText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();

    let structuredData: any = null;
    try {
      structuredData = JSON.parse(cleanedText);
    } catch (_parseErr) {
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          structuredData = JSON.parse(jsonMatch[0]);
        } catch (_innerErr) {}
      }
    }

    if (!structuredData) {
      console.error('[Cloudflare AI JSON Parse Failed]', rawText);
      throw ApiError.badGateway('La réponse générée par l\'IA n\'est pas un JSON valide.', 'INVALID_JSON');
    }

    const defaultHeader = ["Semestre", "Code UE", "Intitulé UE", "Code ECUE", "Intitulé ECUE", "ECTS", "Enseignant"];

    if (kind !== 'timetable') {
      let rows: string[][] = [];
      if (Array.isArray(structuredData)) {
        rows = structuredData.map((item: any) => {
          if (Array.isArray(item)) return item.map((v) => String(v));
          return [
            String(item.semestre || item.Semester || ''),
            String(item.codeUE || item.CodeUE || ''),
            String(item.intituleUE || item.IntituleUE || ''),
            String(item.codeECUE || item.CodeECUE || ''),
            String(item.intituleECUE || item.IntituleECUE || ''),
            String(item.ects || item.ECTS || ''),
            String(item.enseignant || item.Enseignant || ''),
          ];
        });
      } else if (structuredData && Array.isArray(structuredData.rows)) {
        rows = structuredData.rows;
      }

      const firstRowStr = (rows[0] || []).join(' ').toLowerCase();
      const hasHeaderKeywords = ['code', 'intitule', 'ue', 'semestre', 'ecue'].some((kw) => firstRowStr.includes(kw));

      if (!hasHeaderKeywords) {
        rows.unshift(defaultHeader);
      }

      sendSuccess(res, { rows }, 200);
      return;
    }

    sendSuccess(res, structuredData, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint de diagnostic non authentifié pour vérifier la configuration des clés IA.
 */
export async function debugAiConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    const geminiKey = process.env.GEMINI_API_KEY || (env as any).GEMINI_API_KEY || '';

    const envInfo = {
      accountIdSet: !!accountId,
      tokenSet: !!apiToken,
      geminiSet: !!geminiKey,
    };

    let testStructure = { status: 400, body: 'Non exécuté' };

    if (accountId && apiToken) {
      try {
        const testPrompt = `Tu es un assistant d'extraction de maquette académique. Réponds EXCLUSIVEMENT par un tableau JSON d'objets strict.\n\nTEXTE BRUT OCR :\nMacoscommoie (MART| MIF4116 | Microéconomie Financière 1 | MIF41151 | Décision dans l'Incertain | 24 | 12`;

        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: testPrompt,
            max_tokens: 4096,
          }),
        });

        const text = await resp.text();
        testStructure = {
          status: resp.status,
          body: text.slice(0, 300),
        };
      } catch (err: any) {
        testStructure = {
          status: 500,
          body: (err?.message || String(err)).slice(0, 300),
        };
      }
    }

    sendSuccess(
      res,
      {
        env: envInfo,
        testStructure,
      },
      200
    );
  } catch (error) {
    next(error);
  }
}
