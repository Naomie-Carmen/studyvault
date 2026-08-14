import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

/**
 * Interroge l'API Google Gemini ListModels pour obtenir la liste dynamique
 * des modèles actuellement disponibles et supportant `generateContent`.
 */
async function fetchAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log('[Gemini] Interrogation dynamique de ModelService.ListModels...');
    const response = await fetch(listUrl);
    if (!response.ok) return [];

    const data = (await response.json()) as any;
    if (!data.models || !Array.isArray(data.models)) return [];

    const validModels: string[] = [];
    for (const m of data.models) {
      if (
        m.name &&
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      ) {
        const cleanName = m.name.replace(/^models\//, '');
        validModels.push(cleanName);
      }
    }
    console.log(`[Gemini] Modèles découverts dynamiquement (${validModels.length}) :`, validModels.join(', '));
    return validModels;
  } catch (err) {
    console.error('[Gemini] Erreur lors de la découverte dynamique des modèles:', err);
    return [];
  }
}

/**
 * Tente d'exécuter l'extraction vision via l'API Google Gemini.
 * Ordre de priorité : gemini-2.5-pro -> gemini-2.0-flash-exp -> autres modèles candidats.
 */
async function callGeminiVisionApi(images: Express.Multer.File[], prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY || (env as any).GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Clé API Gemini non configurée (GEMINI_API_KEY).');
  }

  const envModel = process.env.GEMINI_MODEL;
  const defaultCandidates = [
    ...(envModel ? [envModel] : []),
    'gemini-2.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];

  let modelCandidates = Array.from(new Set(defaultCandidates));

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

  let lastErrorText = '';
  let triedModels = new Set<string>();

  for (const model of modelCandidates) {
    triedModels.add(model);
    console.log(`[Gemini] Modèle utilisé : ${model}`);
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
        lastErrorText = errText;
        console.error(`[Gemini API Error ${response.status} avec ${model}]`, errText);

        const isModelUnavailable =
          response.status === 404 ||
          errText.includes('no longer available') ||
          errText.includes('not found') ||
          errText.includes('is not supported');

        if (isModelUnavailable) {
          console.warn(`[Gemini] Modèle ${model} indisponible (404/obsolète), tentative de fallback...`);
          continue;
        }

        throw new Error(`Erreur API Gemini (${response.status}) : ${errText}`);
      }

      const result = (await response.json()) as any;
      const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawJsonText) {
        throw new Error('Aucune réponse textuelle générée par Gemini.');
      }

      try {
        return JSON.parse(rawJsonText);
      } catch (parseErr) {
        console.error('[Gemini JSON Parse Error]', rawJsonText);
        throw new Error('La réponse générée par Gemini n\'est pas un JSON valide.');
      }
    } catch (err: any) {
      lastErrorText = err?.message || String(err);
    }
  }

  // Découverte dynamique si aucun candidat prédéfini n'a fonctionné
  console.warn('[Gemini] Tous les modèles candidats Gemini ont échoué. Découverte dynamique via ListModels...');
  const discoveredModels = await fetchAvailableGeminiModels(apiKey);

  for (const model of discoveredModels) {
    if (triedModels.has(model)) continue;
    triedModels.add(model);

    console.log(`[Gemini] Modèle découvert utilisé : ${model}`);
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
        lastErrorText = errText;
        console.error(`[Gemini API Error ${response.status} avec ${model}]`, errText);
        continue;
      }

      const result = (await response.json()) as any;
      const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawJsonText) continue;

      try {
        return JSON.parse(rawJsonText);
      } catch (parseErr) {
        console.error('[Gemini JSON Parse Error]', rawJsonText);
        continue;
      }
    } catch (err: any) {
      lastErrorText = err?.message || String(err);
    }
  }

  throw new Error(`Tous les modèles Gemini ont échoué. Dernier détail : ${lastErrorText}`);
}

/**
 * Fallback Cloudflare Workers AI via le modèle vision @cf/meta/llama-3.2-11b-vision-preview
 */
async function callCloudflareVisionApi(
  images: Express.Multer.File[],
  prompt: string
): Promise<any> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

  if (!accountId || !apiToken) {
    throw new Error('Variables d\'environnement CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_API_TOKEN non configurées.');
  }

  console.log('[Cloudflare AI] Lancement du fallback vision (@cf/meta/llama-3.2-11b-vision-preview)...');

  const file = images[0];
  const base64Data = file && file.buffer ? file.buffer.toString('base64') : '';
  if (!base64Data) {
    throw new Error('Aucune image valide fournie pour Cloudflare Workers AI.');
  }

  const imageByteArray = Array.from(Buffer.from(base64Data, 'base64'));
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      image: imageByteArray,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Cloudflare Workers AI Error ${response.status}]`, errText);
    throw new Error(`Cloudflare AI a répondu avec le statut ${response.status} : ${errText}`);
  }

  const result = (await response.json()) as any;
  const rawText = result.result?.response || result.result?.description || result.result?.text || '';

  if (!rawText) {
    throw new Error('Aucune réponse textuelle reçue de Cloudflare Workers AI.');
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
    throw new Error('Format JSON invalide retourné par Cloudflare Workers AI.');
  }
}

export async function extractMaquette(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files || files.length === 0) {
      throw ApiError.badRequest('Aucune photo de maquette envoyée.', 'NO_IMAGES');
    }

    const geminiPrompt = `Tu es un assistant d'extraction de maquette pédagogique universitaire. Extrais la structure de cette image sous forme de tableau JSON strict : { "rows": [ ["CODE_UE", "INTITULE_UE", "CODE_ECUE", "INTITULE_ECUE", "CM", "TD", "TP", "TPE", "ECTS"], ... ] }. Ne rien inventer ; recopier exactement les textes et nombres.`;
    const cfPrompt = `Extract this academic curriculum table into JSON: array of objects with keys semestre, codeUE, intituleUE, codeECUE, intituleECUE, ects, enseignant. One object per ECUE row. Return ONLY valid JSON, no markdown.`;

    try {
      const extractedData = await callGeminiVisionApi(files, geminiPrompt);
      sendSuccess(res, extractedData, 200);
      return;
    } catch (geminiErr: any) {
      console.warn('[Vision AI] Gemini a échoué. Tentative de fallback sur Cloudflare Workers AI...', geminiErr?.message);
    }

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
      console.error('[Vision AI Error] Gemini et Cloudflare Workers AI ont tous deux échoué.', cfErr);
      throw ApiError.badGateway(
        `L'extraction Vision par IA (Gemini et Cloudflare) est momentanément indisponible. Vérifiez la configuration de CLOUDFLARE_API_TOKEN / GEMINI_API_KEY. Détail : ${cfErr?.message || 'Erreur inconnue'}`,
        'VISION_AI_FAILED'
      );
    }
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

    const geminiPrompt = `Tu es un assistant d'extraction d'emploi du temps universitaire. Extrais le tableau de cette image en JSON strict, sans markdown : un tableau d'objets avec les clés jour (lundi..dimanche), startTime (HH:MM), endTime (HH:MM), matiere, salle, enseignant, groupe, type (CM/TD/TP) (chaînes vides si absentes). Un objet par séance. Ne rien inventer ; recopier exactement.`;
    const cfPrompt = `Extract this timetable table into JSON: array of objects with keys jour, startTime, endTime, matiere, salle, enseignant, groupe, type. One object per session. Return ONLY valid JSON, no markdown.`;

    try {
      const extractedData = await callGeminiVisionApi(files, geminiPrompt);
      sendSuccess(res, extractedData, 200);
      return;
    } catch (geminiErr: any) {
      console.warn('[Vision AI] Gemini a échoué. Tentative de fallback sur Cloudflare Workers AI...', geminiErr?.message);
    }

    try {
      const cfData = await callCloudflareVisionApi(files, cfPrompt);
      sendSuccess(res, cfData, 200);
      return;
    } catch (cfErr: any) {
      console.error('[Vision AI Error] Gemini et Cloudflare Workers AI ont tous deux échoué.', cfErr);
      throw ApiError.badGateway(
        `L'extraction Vision par IA (Gemini et Cloudflare) est momentanément indisponible. Vérifiez la configuration de CLOUDFLARE_API_TOKEN / GEMINI_API_KEY. Détail : ${cfErr?.message || 'Erreur inconnue'}`,
        'VISION_AI_FAILED'
      );
    }
  } catch (error) {
    next(error);
  }
}
