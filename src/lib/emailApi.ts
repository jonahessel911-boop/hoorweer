export type EmailSendResult = { ok: true } | { ok: false; error: string };

async function postEmail<T extends Record<string, string>>(
  path: string,
  body: T
): Promise<EmailSendResult> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error || 'E-mail versturen mislukt.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Kon geen verbinding maken met de e-mailserver.' };
  }
}

export function sendTestLinkEmail(params: {
  to: string;
  naam: string;
  testUrl: string;
}) {
  return postEmail('/api/email/test-link', params);
}

export function sendOfferEmail(params: {
  to: string;
  naam: string;
  productnaam: string;
  prijsFormatted: string;
  offerUrl: string;
}) {
  return postEmail('/api/email/offer', params);
}

export function sendPaymentLinkEmail(params: {
  to: string;
  naam: string;
  productnaam: string;
  prijsFormatted: string;
  paymentUrl: string;
}) {
  return postEmail('/api/email/payment-link', params);
}

export function sendTestCompleteEmail(params: { to: string; naam: string }) {
  return postEmail('/api/email/test-complete', params);
}
