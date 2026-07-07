import { sendPostmarkEmail } from './postmark.ts';
import {
  buildOfferEmail,
  buildPaymentLinkEmail,
  buildTestCompleteEmail,
  buildTestLinkEmail,
} from './email/templates.ts';

export type EmailRoute =
  | '/api/email/test-link'
  | '/api/email/offer'
  | '/api/email/payment-link'
  | '/api/email/test-complete';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Veld "${key}" is verplicht.`);
  }
  return value.trim();
}

export async function handleEmailRequest(
  route: EmailRoute,
  body: Record<string, unknown>,
  postmarkToken: string
): Promise<{ messageId: string }> {
  const to = requireString(body, 'to');
  if (!isValidEmail(to)) {
    throw new Error('Ongeldig e-mailadres.');
  }

  let emailPayload;

  switch (route) {
    case '/api/email/test-link': {
      const naam = requireString(body, 'naam');
      const testUrl = requireString(body, 'testUrl');
      emailPayload = buildTestLinkEmail({ naam, testUrl });
      break;
    }
    case '/api/email/offer': {
      const naam = requireString(body, 'naam');
      const productnaam = requireString(body, 'productnaam');
      const prijsFormatted = requireString(body, 'prijsFormatted');
      const offerUrl = requireString(body, 'offerUrl');
      emailPayload = buildOfferEmail({ naam, productnaam, prijsFormatted, offerUrl });
      break;
    }
    case '/api/email/payment-link': {
      const naam = requireString(body, 'naam');
      const productnaam = requireString(body, 'productnaam');
      const prijsFormatted = requireString(body, 'prijsFormatted');
      const paymentUrl = requireString(body, 'paymentUrl');
      emailPayload = buildPaymentLinkEmail({ naam, productnaam, prijsFormatted, paymentUrl });
      break;
    }
    case '/api/email/test-complete': {
      const naam = requireString(body, 'naam');
      emailPayload = buildTestCompleteEmail({ naam });
      break;
    }
    default:
      throw new Error('Onbekend e-mailtype.');
  }

  return sendPostmarkEmail(postmarkToken, { to, ...emailPayload });
}

export function emailErrorStatus(message: string): number {
  return message.includes('verplicht') || message.includes('Ongeldig') ? 400 : 500;
}
