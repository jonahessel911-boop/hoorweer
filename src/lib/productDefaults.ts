import type { Product } from './types';
import { PLACEHOLDER_PRODUCT_IMAGE } from './productUtils';

export function normalizeProduct(raw: Partial<Product> & Pick<Product, 'id' | 'naam' | 'model' | 'listprijs' | 'created_at'>): Product {
  return {
    id: raw.id,
    naam: raw.naam,
    model: raw.model,
    beschrijving: raw.beschrijving ?? '',
    listprijs: Number(raw.listprijs),
    image_url: raw.image_url ?? null,
    kenmerken: raw.kenmerken ?? '',
    actief: raw.actief ?? true,
    created_at: raw.created_at,
  };
}

export function defaultSeedProduct(): Product {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    naam: 'HearDirect Hoortoestel Set',
    model: 'HD-1',
    beschrijving: 'Volledig in het oor hoortoestel met oplaadcase. Geschikt bij licht tot matig gehoorverlies.',
    listprijs: 349,
    image_url: PLACEHOLDER_PRODUCT_IMAGE,
    kenmerken: 'HearDirect hoortoestel-set incl. oplaadcase\nNederlandse handleiding\n2 jaar garantie\n30 dagen op proef',
    actief: true,
    created_at: new Date().toISOString(),
  };
}
