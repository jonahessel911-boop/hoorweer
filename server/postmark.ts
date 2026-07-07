import { EMAIL_BRAND } from './email/brand.ts';

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  tag?: string;
}

export async function sendPostmarkEmail(
  token: string,
  params: SendEmailParams
): Promise<{ messageId: string }> {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify({
      From: `${EMAIL_BRAND.fromName} <${EMAIL_BRAND.fromEmail}>`,
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.htmlBody,
      TextBody: params.textBody,
      MessageStream: 'outbound',
      Tag: params.tag,
    }),
  });

  const data = (await response.json()) as {
    MessageID?: string;
    Message?: string;
    ErrorCode?: number;
  };

  if (!response.ok) {
    throw new Error(data.Message || `Postmark fout (${response.status})`);
  }

  return { messageId: data.MessageID || '' };
}
