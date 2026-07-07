import type { Connect } from 'vite';
import type { ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import {
  buildTestUrl,
  insertLeadInSupabase,
  isWebhookAuthorized,
  parseLeadWebhookBody,
  type LeadWebhookEnv,
} from './leadWebhook.ts';

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function resolveAppUrl(req: Connect.IncomingMessage, configured?: string): string {
  if (configured?.trim()) {
    return configured.trim().replace(/\/$/, '');
  }
  const host = req.headers.host;
  if (!host) return 'http://localhost:5173';
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${host}`;
}

function createHandler(env: LeadWebhookEnv): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/webhooks/leads')) {
      return next();
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Secret');
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed. Gebruik POST.' });
      return;
    }

    if (!env.webhookSecret) {
      json(res, 500, {
        error: 'LEAD_WEBHOOK_SECRET ontbreekt. Stel een geheim in via .env.local.',
      });
      return;
    }

    if (!isWebhookAuthorized(req, env.webhookSecret)) {
      json(res, 401, { error: 'Unauthorized. Ongeldige of ontbrekende webhook-secret.' });
      return;
    }

    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const input = parseLeadWebhookBody(body);
      const lead = await insertLeadInSupabase(env, input);
      const appUrl = resolveAppUrl(req, env.appUrl);

      json(res, 201, {
        id: lead.id,
        naam: input.naam,
        email: input.email,
        telefoon: input.telefoon,
        test_token: lead.test_token,
        test_url: buildTestUrl(appUrl, lead.test_token),
        created_at: lead.created_at,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lead kon niet worden aangemaakt.';
      const status = message.includes('verplicht') || message.includes('Ongeldig') ? 400 : 500;
      json(res, status, { error: message });
    }
  };
}

function loadWebhookEnv(mode: string, envDir: string): LeadWebhookEnv {
  const env = loadEnv(mode, envDir, '');
  return {
    supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY,
    webhookSecret: env.LEAD_WEBHOOK_SECRET,
    appUrl: env.APP_URL || env.VITE_APP_URL,
  };
}

export function leadWebhookPlugin(): Plugin {
  return {
    name: 'lead-webhook-api',
    configureServer(server) {
      const env = loadWebhookEnv(server.config.mode, server.config.envDir || process.cwd());
      server.middlewares.use(createHandler(env));
    },
    configurePreviewServer(server) {
      const env = loadWebhookEnv(server.config.mode, server.config.envDir || process.cwd());
      server.middlewares.use(createHandler(env));
    },
  };
}
