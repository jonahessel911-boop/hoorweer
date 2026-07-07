import type { Connect } from 'vite';
import type { ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { emailErrorStatus, handleEmailRequest, type EmailRoute } from './emailRoutes.ts';

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

const EMAIL_ROUTES = new Set<EmailRoute>([
  '/api/email/test-link',
  '/api/email/offer',
  '/api/email/payment-link',
  '/api/email/test-complete',
]);

function createHandler(postmarkToken: string | undefined): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const route = req.url?.split('?')[0];
    if (!route || !EMAIL_ROUTES.has(route as EmailRoute)) {
      return next();
    }

    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    if (!postmarkToken) {
      json(res, 500, {
        error: 'POSTMARK_SERVER_TOKEN ontbreekt. Voeg je Postmark token toe aan .env.local.',
      });
      return;
    }

    try {
      const raw = await readBody(req);
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const result = await handleEmailRequest(route as EmailRoute, body, postmarkToken);
      json(res, 200, { ok: true, messageId: result.messageId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'E-mail versturen mislukt.';
      json(res, emailErrorStatus(message), { error: message });
    }
  };
}

export function emailApiPlugin(): Plugin {
  return {
    name: 'email-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      server.middlewares.use(createHandler(env.POSTMARK_SERVER_TOKEN));
    },
    configurePreviewServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      server.middlewares.use(createHandler(env.POSTMARK_SERVER_TOKEN));
    },
  };
}
