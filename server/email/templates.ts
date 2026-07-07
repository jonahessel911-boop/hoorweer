import { renderEmailHtml, renderPlainEmail } from './layout.ts';

export interface TestLinkEmailData {
  naam: string;
  testUrl: string;
}

export function buildTestLinkEmail(data: TestLinkEmailData) {
  const salutation = `Beste ${data.naam},`;
  const options = {
    previewText: 'Start uw persoonlijke online hoortest — duurt ongeveer 7 minuten.',
    headline: 'Uw persoonlijke hoortest',
    salutation,
    paragraphs: [
      'Bedankt voor uw interesse in HearDirect. Onze specialist heeft een online hoortest voor u klaargezet.',
      'De test duurt ongeveer 7 minuten. U beantwoordt eerst enkele korte vragen over uw gehoor in het dagelijks leven, daarna hoort u verschillende tonen. Gebruik bij voorkeur een koptelefoon en zorg voor een rustige omgeving.',
      'Na afloop bespreekt onze specialist uw resultaat persoonlijk met u.',
    ],
    cta: { label: 'Start hoortest', url: data.testUrl },
    note: 'Deze test geeft een indicatie van uw gehoor en is geen medische diagnose.',
  };

  return {
    subject: 'Uw persoonlijke hoortest — HearDirect',
    htmlBody: renderEmailHtml(options),
    textBody: renderPlainEmail(options),
    tag: 'test-link',
  };
}

export interface OfferEmailData {
  naam: string;
  productnaam: string;
  prijsFormatted: string;
  offerUrl: string;
}

export function buildOfferEmail(data: OfferEmailData) {
  const salutation = `Beste ${data.naam},`;
  const options = {
    previewText: `Uw persoonlijke offerte voor ${data.productnaam} staat klaar.`,
    headline: 'Uw persoonlijke offerte',
    salutation,
    paragraphs: [
      'Op basis van uw hoortest heeft onze specialist een persoonlijk advies voor u samengesteld.',
      `Hierbij ontvangt u uw offerte voor de ${data.productnaam} — totaal ${data.prijsFormatted}.`,
      'Lees de offerte rustig door en onderteken digitaal wanneer u akkoord bent. Heeft u vragen? Onze specialist helpt u graag.',
    ],
    cta: { label: 'Bekijk en onderteken offerte', url: data.offerUrl },
    note: 'U heeft 14 dagen herroepingsrecht vanaf ontvangst van het product.',
  };

  return {
    subject: `Uw persoonlijke offerte — ${data.productnaam}`,
    htmlBody: renderEmailHtml(options),
    textBody: renderPlainEmail(options),
    tag: 'offer',
  };
}

export interface PaymentLinkEmailData {
  naam: string;
  productnaam: string;
  prijsFormatted: string;
  paymentUrl: string;
}

export function buildPaymentLinkEmail(data: PaymentLinkEmailData) {
  const salutation = `Beste ${data.naam},`;
  const options = {
    previewText: 'Voltooi uw betaling voor uw HearDirect hoortoestel.',
    headline: 'Betaallink voor uw bestelling',
    salutation,
    paragraphs: [
      'Bedankt voor het ondertekenen van uw offerte. Uw order is bevestigd door onze specialist.',
      `Via onderstaande link kunt u de betaling voltooien voor uw ${data.productnaam} (${data.prijsFormatted}).`,
      'Na ontvangst van uw betaling starten wij direct met de verwerking van uw bestelling.',
    ],
    cta: { label: 'Betaal nu', url: data.paymentUrl },
    note: 'Heeft u hulp nodig bij het betalen? Neem gerust contact op met onze klantenservice.',
  };

  return {
    subject: 'Betaallink — HearDirect',
    htmlBody: renderEmailHtml(options),
    textBody: renderPlainEmail(options),
    tag: 'payment-link',
  };
}

export interface TestCompleteEmailData {
  naam: string;
}

export function buildTestCompleteEmail(data: TestCompleteEmailData) {
  const salutation = `Beste ${data.naam},`;
  const options = {
    previewText: 'Uw hoortest is ontvangen — onze specialist neemt contact met u op.',
    headline: 'Uw resultaat is ontvangen',
    salutation,
    paragraphs: [
      'Bedankt voor het afronden van uw online hoortest.',
      'Uw resultaten zijn doorgestuurd naar onze specialist. Wij hebben goed nieuws voor u — onze specialist neemt binnen 24 uur persoonlijk contact met u op om de uitslag te bespreken en uw vervolgstappen te bespreken.',
    ],
    note: 'Deze online hoortest is geen medische diagnose.',
  };

  return {
    subject: 'Uw hoortest is ontvangen — HearDirect',
    htmlBody: renderEmailHtml(options),
    textBody: renderPlainEmail(options),
    tag: 'test-complete',
  };
}
