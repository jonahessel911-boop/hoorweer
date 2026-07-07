import type { Order } from './types';
import { BEDENKTIJD_DEFAULT_DAYS } from './orderTimeline';

const COUNTER_KEY = 'hear-direct-order-counter';

export function nextOrderNumber(): number {
  const stored = localStorage.getItem(COUNTER_KEY);
  const current = stored ? parseInt(stored, 10) : 10000000;
  const next = current + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

export function normalizeOrder(
  raw: Partial<Order> & Pick<Order, 'id' | 'lead_id' | 'productnaam' | 'prijs' | 'offerte_token' | 'status' | 'created_at'>
): Order {
  const listprijs = raw.listprijs ?? raw.prijs;
  const korting = raw.korting_bedrag ?? 0;

  return {
    id: raw.id,
    order_nummer: raw.order_nummer ?? null,
    lead_id: raw.lead_id,
    product_id: raw.product_id ?? null,
    productnaam: raw.productnaam,
    product_model: raw.product_model ?? null,
    product_beschrijving: raw.product_beschrijving ?? null,
    product_image_url: raw.product_image_url ?? null,
    product_kenmerken: raw.product_kenmerken ?? null,
    listprijs: Number(listprijs),
    korting_bedrag: Number(korting),
    prijs: Number(raw.prijs),
    offerte_token: raw.offerte_token,
    status: raw.status,
    delivery_status: raw.delivery_status ?? 'offerte',
    land: raw.land ?? 'Nederland',
    postcode: raw.postcode ?? null,
    huisnummer: raw.huisnummer ?? null,
    huisnummer_toevoeging: raw.huisnummer_toevoeging ?? null,
    straat: raw.straat ?? null,
    plaats: raw.plaats ?? null,
    provincie: raw.provincie ?? null,
    ondertekend_door: raw.ondertekend_door ?? null,
    ondertekend_op: raw.ondertekend_op ?? null,
    signature_image: raw.signature_image ?? null,
    signed_offer_pdf: raw.signed_offer_pdf ?? null,
    aangekomen_op: raw.aangekomen_op ?? null,
    bedenktijd_dagen: raw.bedenktijd_dagen ?? BEDENKTIJD_DEFAULT_DAYS,
    netto_sale_op: raw.netto_sale_op ?? null,
    cancelled_op: raw.cancelled_op ?? null,
    cancelled_from: raw.cancelled_from ?? null,
    created_at: raw.created_at,
  };
}
