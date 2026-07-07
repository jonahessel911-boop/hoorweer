import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  emailErrorStatus,
  handleEmailRequest,
  type EmailRoute,
} from '../../server/emailRoutes.ts';

const ROUTES: Record<string, EmailRoute> = {
  'test-link': '/api/email/test-link',
  offer: '/api/email/offer',
  'payment-link': '/api/email/payment-link',
  'test-complete': '/api/email/test-complete',
};

export function createEmailHandler(type: keyof typeof ROUTES) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = process.env.POSTMARK_SERVER_TOKEN;
    if (!token) {
      return res.status(500).json({
        error: 'POSTMARK_SERVER_TOKEN ontbreekt. Voeg je Postmark token toe aan de omgevingsvariabelen.',
      });
    }

    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await handleEmailRequest(ROUTES[type], body, token);
      return res.status(200).json({ ok: true, messageId: result.messageId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'E-mail versturen mislukt.';
      return res.status(emailErrorStatus(message)).json({ error: message });
    }
  };
}
