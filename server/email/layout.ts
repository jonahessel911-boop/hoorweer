import { EMAIL_BRAND } from './brand.ts';

const { colors } = EMAIL_BRAND;

function logoHtml(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;font-weight:700;color:${colors.white};letter-spacing:-0.02em;vertical-align:middle;">
          HD
        </td>
        <td style="padding-left:6px;vertical-align:middle;">
          <svg width="36" height="24" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M4 14 Q12 4, 20 14 T36 14" stroke="${colors.lightBlue}" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M8 14 Q14 8, 20 14 T32 14" stroke="${colors.white}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.85"/>
          </svg>
        </td>
      </tr>
    </table>
  `;
}

export interface EmailLayoutOptions {
  previewText: string;
  headline: string;
  salutation?: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  note?: string;
}

export function renderEmailHtml(options: EmailLayoutOptions): string {
  const salutation = options.salutation ?? 'Geachte heer/mevrouw,';
  const paragraphs = options.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.65;color:${colors.text};">${p}</p>`
    )
    .join('');

  const cta = options.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
        <tr>
          <td style="border-radius:14px;background:${colors.blue};">
            <a href="${options.cta.url}" target="_blank" style="display:inline-block;padding:16px 32px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;font-weight:600;color:${colors.white};text-decoration:none;border-radius:14px;">
              ${options.cta.label}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;color:${colors.muted};word-break:break-all;">
        Of kopieer deze link: <a href="${options.cta.url}" style="color:${colors.blue};text-decoration:none;">${options.cta.url}</a>
      </p>
    `
    : '';

  const note = options.note
    ? `<p style="margin:20px 0 0;padding:14px 16px;background:${colors.bg};border-radius:10px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.55;color:${colors.muted};border:1px solid ${colors.border};">${options.note}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${options.headline}</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${colors.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${options.previewText}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colors.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="email-shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${colors.white};border-radius:14px;overflow:hidden;border:1px solid ${colors.border};box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:24px 32px;background:${colors.navy};">
              ${logoHtml()}
              <p style="margin:10px 0 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(255,255,255,0.82);">${EMAIL_BRAND.tagline}</p>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:32px 36px 28px;">
              <h1 style="margin:0 0 20px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:${colors.navy};">${options.headline}</h1>
              <p style="margin:0 0 16px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.65;color:${colors.text};">${salutation}</p>
              ${paragraphs}
              ${cta}
              ${note}
              <p style="margin:28px 0 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:${colors.text};">
                Met vriendelijke groet,<br>
                <strong>Uw specialist bij ${EMAIL_BRAND.name}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 36px 24px;border-top:1px solid ${colors.border};background:${colors.bg};">
              <p style="margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.55;color:${colors.muted};">
                ${EMAIL_BRAND.disclaimer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderPlainEmail(options: EmailLayoutOptions): string {
  const salutation = options.salutation ?? 'Geachte heer/mevrouw,';
  const lines = [
    options.headline,
    '',
    salutation,
    '',
    ...options.paragraphs,
    '',
  ];
  if (options.cta) {
    lines.push(`${options.cta.label}: ${options.cta.url}`, '');
  }
  if (options.note) {
    lines.push(options.note, '');
  }
  lines.push(`Met vriendelijke groet,`, `Uw specialist bij ${EMAIL_BRAND.name}`, '', EMAIL_BRAND.disclaimer);
  return lines.join('\n');
}
