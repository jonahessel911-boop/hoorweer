import type { Connect } from 'vite';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

const SYSTEM_PROMPT = `Je bent een audicien bij HearDirect. Je analyseert online hoortestresultaten (screening, geen diagnose).

Antwoord ALLEEN met geldige JSON (geen markdown) in dit formaat:
{
  "bevindingen": ["korte punt 1", "korte punt 2", "korte punt 3"],
  "advies": "1-2 zinnen: wat betekent dit en wat is de vervolgstap (eventueel product noemen)",
  "details": "optioneel: iets meer uitleg voor de adviseur (max 60 woorden)"
}

Regels:
- bevindingen: 3-4 punten, elk max 12 woorden, helder Nederlands, geen jargon
- Noem concrete frequenties/oren alleen als relevant (bijv. "1000 Hz rechts gemist")
- advies: praktisch en geruststellend, geen angstaanjagende taal
- details: alleen extra context, niet herhalen van bevindingen`;

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function createHandler(apiKey: string | undefined): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.url !== '/api/hearing-analysis' && !req.url?.startsWith('/api/hearing-analysis?')) {
      return next();
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'ANTHROPIC_API_KEY ontbreekt. Voeg deze toe aan .env.local in de projectmap.',
        })
      );
      return;
    }

    try {
      const body = JSON.parse(await readBody(req)) as { prompt?: string };
      if (!body.prompt?.trim()) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Geen prompt meegegeven' }));
        return;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: body.prompt }],
        }),
      });

      const data = (await response.json()) as {
        error?: { message?: string };
        content?: { type: string; text?: string }[];
      };

      if (!response.ok) {
        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: data.error?.message || `Anthropic API fout (${response.status})`,
          })
        );
        return;
      }

      const text = data.content?.find((c) => c.type === 'text')?.text?.trim() || '';
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ analysis: text }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Analyse mislukt',
        })
      );
    }
  };
}

export function anthropicApiPlugin(): Plugin {
  return {
    name: 'anthropic-hearing-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      const apiKey = env.ANTHROPIC_API_KEY;
      server.middlewares.use(createHandler(apiKey));
    },
    configurePreviewServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      const apiKey = env.ANTHROPIC_API_KEY;
      server.middlewares.use(createHandler(apiKey));
    },
  };
}
