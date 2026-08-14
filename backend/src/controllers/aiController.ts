import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

/**
 * Reconstruire et corriger un texte brut OCR déformé sous forme de JSON structuré
 * à l'aide de Cloudflare Workers AI (Llama-4 Scout en mode texte pur).
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

export async function extractMaquette(req: Request, res: Response, next: NextFunction): Promise<void> {
  structureTextWithAi(req, res, next);
}

export async function extractTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  structureTextWithAi(req, res, next);
}
