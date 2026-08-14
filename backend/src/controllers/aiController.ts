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
 * Appelle l'API Gemini avec fallback automatique et découverte dynamique
 * des modèles disponibles via ModelService.ListModels.
 */
async function callGeminiVisionApi(images: Express.Multer.File[], prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY || (env as any).GEMINI_API_KEY || '';
  if (!apiKey) {
    throw ApiError.unauthorized('Clé API Gemini non configurée (GEMINI_API_KEY).', 'NO_GEMINI_KEY');
  }

  const envModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const defaultCandidates = [
    envModel,
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash-8b',
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

  // Étape 1 : Essayer les modèles candidats prédéfinis
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

        throw ApiError.badGateway(`Erreur API Gemini (${response.status}) : ${errText}`, 'GEMINI_API_ERROR');
      }

      const result = (await response.json()) as any;
      const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawJsonText) {
        throw ApiError.badGateway('Aucune réponse textuelle générée par Gemini.', 'EMPTY_GEMINI_RESPONSE');
      }

      try {
        return JSON.parse(rawJsonText);
      } catch (parseErr) {
        console.error('[Gemini JSON Parse Error]', rawJsonText);
        throw ApiError.badGateway('La réponse générée par Gemini n\'est pas un JSON valide.', 'INVALID_JSON_RESPONSE');
      }
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      lastErrorText = err?.message || String(err);
    }
  }

  // Étape 2 : Découverte dynamique si aucun candidat par défaut n'a fonctionné
  console.warn('[Gemini] Aucun modèle par défaut fonctionnel. Découverte dynamique via ListModels...');
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
      if (err instanceof ApiError) throw err;
      lastErrorText = err?.message || String(err);
    }
  }

  throw ApiError.badGateway(
    `Tous les modèles Gemini ont été tentés et ont tous échoué. Dernier détail d'erreur : ${lastErrorText}`,
    'ALL_GEMINI_MODELS_FAILED'
  );
}

export async function extractMaquette(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files || files.length === 0) {
      throw ApiError.badRequest('Aucune photo de maquette envoyée.', 'NO_IMAGES');
    }

    const prompt = `Tu es un assistant d'extraction de maquette pédagogique universitaire. Extrais la structure de cette image sous forme de tableau JSON strict : { "rows": [ ["CODE_UE", "INTITULE_UE", "CODE_ECUE", "INTITULE_ECUE", "CM", "TD", "TP", "TPE", "ECTS"], ... ] }. Ne rien inventer ; recopier exactement les textes et nombres.`;

    const extractedData = await callGeminiVisionApi(files, prompt);
    sendSuccess(res, extractedData, 200);
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

    const prompt = `Tu es un assistant d'extraction d'emploi du temps universitaire. Extrais le tableau de cette image en JSON strict, sans markdown : un tableau d'objets avec les clés jour (lundi..dimanche), startTime (HH:MM), endTime (HH:MM), matiere, salle, enseignant, groupe, type (CM/TD/TP) (chaînes vides si absentes). Un objet par séance. Ne rien inventer ; recopier exactement.`;

    const extractedData = await callGeminiVisionApi(files, prompt);
    sendSuccess(res, extractedData, 200);
  } catch (error) {
    next(error);
  }
}
