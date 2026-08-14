import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

/**
 * Endpoint de diagnostic non authentifié pour vérifier la configuration des clés IA
 * et tester la réponse des modèles Cloudflare Workers AI.
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

    const testModelCall = async (modelName: string) => {
      if (!accountId || !apiToken) {
        return { status: 400, body: 'CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN non défini' };
      }
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'Reply with the word OK',
          }),
        });

        const text = await resp.text();
        return {
          status: resp.status,
          body: text.slice(0, 300),
        };
      } catch (err: any) {
        return {
          status: 500,
          body: (err?.message || String(err)).slice(0, 300),
        };
      }
    };

    const [testLlama32Instruct, testLlama32Preview, testLlama4Scout] = await Promise.all([
      testModelCall('@cf/meta/llama-3.2-11b-vision-instruct'),
      testModelCall('@cf/meta/llama-3.2-11b-vision-preview'),
      testModelCall('@cf/meta/llama-4-scout-17b-16e-instruct'),
    ]);

    sendSuccess(
      res,
      {
        env: envInfo,
        testLlama32Instruct,
        testLlama32Preview,
        testLlama4Scout,
      },
      200
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Exécute l'extraction Vision en premier choix via Cloudflare Workers AI.
 * Modèles tentés : @cf/meta/llama-3.2-11b-vision-instruct, @cf/meta/llama-4-scout-17b-16e-instruct, @cf/meta/llama-3.2-11b-vision-preview, @cf/llava-hf/llava-1.5-7b-hf
 */
async function callCloudflareVisionApi(
  images: Express.Multer.File[],
  prompt: string
): Promise<any> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

  if (!accountId || !apiToken) {
    throw new Error('Variables CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN non configurées.');
  }

  const visionModels = [
    '@cf/meta/llama-3.2-11b-vision-instruct',
    '@cf/meta/llama-4-scout-17b-16e-instruct',
    '@cf/meta/llama-3.2-11b-vision-preview',
    '@cf/llava-hf/llava-1.5-7b-hf',
  ];

  const file = images[0];
  const base64Data = file && file.buffer ? file.buffer.toString('base64') : '';
  if (!base64Data) {
    throw new Error('Aucune image valide fournie pour Cloudflare Workers AI.');
  }

  const imageByteArray = Array.from(Buffer.from(base64Data, 'base64'));
  let lastErrorMsg = '';

  for (const model of visionModels) {
    console.log(`[Cloudflare] Tentative Workers AI sur le modèle : ${model}`);
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          image: imageByteArray,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Cloudflare API Error ${response.status} avec ${model}]`, errText);
        lastErrorMsg = `Cloudflare AI (${response.status}) avec ${model} : ${errText}`;
        continue;
      }

      const result = (await response.json()) as any;
      const rawText =
        result.result?.response ||
        result.result?.description ||
        result.result?.text ||
        (Array.isArray(result.result?.choices) ? result.result.choices[0]?.text : '');

      if (!rawText) {
        console.warn(`[Cloudflare] Modèle ${model} a renvoyé un texte vide.`);
        continue;
      }

      const cleanedText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();

      try {
        return JSON.parse(cleanedText);
      } catch (parseErr) {
        console.error('[Cloudflare AI JSON Parse Error]', rawText);
        const jsonMatch = cleanedText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        continue;
      }
    } catch (err: any) {
      console.error(`[Cloudflare Error avec ${model}]`, err);
      lastErrorMsg = err?.message || String(err);
    }
  }

  throw new Error(`Tous les modèles Cloudflare Workers AI ont échoué. Dernier détail : ${lastErrorMsg}`);
}

/**
 * Fallback de secours sur l'API Google Gemini avec le modèle officiel valide gemini-1.5-flash.
 */
async function callGeminiSingleModelApi(images: Express.Multer.File[], prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY || (env as any).GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Clé API Gemini non configurée (GEMINI_API_KEY).');
  }

  const modelCandidates = Array.from(
    new Set([process.env.GEMINI_MODEL || 'gemini-1.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'])
  );

  const parts: any[] = [{ text: prompt }];

  for (const file of images) {
    const base64Data = file.buffer ? file.buffer.toString('base64') : '';
    if (!base64Data) continue;
    const mimeType = file.mimetype || 'image/jpeg';
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Data,
      },
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0,
      response_mime_type: 'application/json',
    },
  };

  let lastError = '';

  for (const model of modelCandidates) {
    console.log(`[Gemini] Tentative modèle : ${model}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Gemini API Error ${response.status} avec ${model}]`, errText);
        lastError = `Gemini API (${response.status}) : ${errText}`;
        continue;
      }

      const result = (await response.json()) as any;
      const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawJsonText) continue;

      try {
        return JSON.parse(rawJsonText);
      } catch (parseErr) {
        console.error('[Gemini JSON Parse Error]', rawJsonText);
        const jsonMatch = rawJsonText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        continue;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(`Tous les modèles Gemini ont échoué. ${lastError}`);
}

export async function extractMaquette(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files || files.length === 0) {
      throw ApiError.badRequest('Aucune photo de maquette envoyée.', 'NO_IMAGES');
    }

    const cfPrompt = `Extract this academic curriculum table into JSON: array of objects with keys semestre, codeUE, intituleUE, codeECUE, intituleECUE, ects, enseignant. One object per ECUE row. Return ONLY valid JSON, no markdown.`;
    const geminiPrompt = `Tu es un assistant d'extraction de maquette pédagogique universitaire. Extrais la structure de cette image sous forme de tableau JSON strict : { "rows": [ ["CODE_UE", "INTITULE_UE", "CODE_ECUE", "INTITULE_ECUE", "CM", "TD", "TP", "TPE", "ECTS"], ... ] }. Ne rien inventer ; recopier exactement les textes et nombres.`;

    // 1. Cloudflare Workers AI en PREMIER
    try {
      const cfData = await callCloudflareVisionApi(files, cfPrompt);
      let rows: string[][] = [];
      if (Array.isArray(cfData)) {
        rows = cfData.map((item: any) => [
          item.codeUE || '',
          item.intituleUE || '',
          item.codeECUE || '',
          item.intituleECUE || '',
          '',
          '',
          '',
          '',
          String(item.ects || ''),
        ]);
      } else if (cfData && Array.isArray(cfData.rows)) {
        rows = cfData.rows;
      }
      sendSuccess(res, { rows: rows.length > 0 ? rows : cfData }, 200);
      return;
    } catch (cfErr: any) {
      console.error('[Cloudflare] Erreur :', cfErr?.message || cfErr);
    }

    // 2. Fallback Gemini (modèle gemini-1.5-flash valide)
    try {
      const geminiData = await callGeminiSingleModelApi(files, geminiPrompt);
      sendSuccess(res, geminiData, 200);
      return;
    } catch (geminiErr: any) {
      console.error('[Gemini] Erreur :', geminiErr?.message || geminiErr);
    }

    // 3. Si les 2 ont échoué -> 502 Bad Gateway
    throw ApiError.badGateway(
      'L\'extraction IA est momentanément indisponible. Utilisez l\'extraction locale ou réessayez dans 1-2 minutes.',
      'AI_EXTRACTION_UNAVAILABLE'
    );
  } catch (error) {
    next(error);
  }
}

export async function extractTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files || files.length === 0) {
      throw ApiError.badRequest('Aucune photo d\'emploi du temps envoyée.', 'NO_IMAGES');
    }

    const cfPrompt = `Extract this timetable table into JSON: array of objects with keys jour, startTime, endTime, matiere, salle, enseignant, groupe, type. One object per session. Return ONLY valid JSON, no markdown.`;
    const geminiPrompt = `Tu es un assistant d'extraction d'emploi du temps universitaire. Extrais le tableau de cette image en JSON strict, sans markdown : un tableau d'objets avec les clés jour (lundi..dimanche), startTime (HH:MM), endTime (HH:MM), matiere, salle, enseignant, groupe, type (CM/TD/TP) (chaînes vides si absentes). Un objet par séance. Ne rien inventer ; recopier exactement.`;

    // 1. Cloudflare Workers AI en PREMIER
    try {
      const cfData = await callCloudflareVisionApi(files, cfPrompt);
      sendSuccess(res, cfData, 200);
      return;
    } catch (cfErr: any) {
      console.error('[Cloudflare] Erreur :', cfErr?.message || cfErr);
    }

    // 2. Fallback Gemini (modèle gemini-1.5-flash valide)
    try {
      const geminiData = await callGeminiSingleModelApi(files, geminiPrompt);
      sendSuccess(res, geminiData, 200);
      return;
    } catch (geminiErr: any) {
      console.error('[Gemini] Erreur :', geminiErr?.message || geminiErr);
    }

    // 3. Si les 2 ont échoué -> 502 Bad Gateway
    throw ApiError.badGateway(
      'L\'extraction IA est momentanément indisponible. Utilisez l\'extraction locale ou réessayez dans 1-2 minutes.',
      'AI_EXTRACTION_UNAVAILABLE'
    );
  } catch (error) {
    next(error);
  }
}
