import type { Product } from './types';
import { calcFinalPrice } from './pricing';

export const PLACEHOLDER_PRODUCT_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect fill="#EFF6FF" width="400" height="300"/>
      <rect x="120" y="60" width="160" height="120" rx="12" fill="#BFDBFE"/>
      <text x="200" y="220" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#1B2A4A" font-weight="600">HearDirect</text>
    </svg>`
  );

const MAX_IMAGE_WIDTH = 800;
const JPEG_QUALITY = 0.82;

export function productToOrderFields(product: Product, kortingBedrag: number) {
  return {
    product_id: product.id,
    productnaam: product.naam,
    product_model: product.model,
    product_beschrijving: product.beschrijving,
    product_image_url: product.image_url,
    product_kenmerken: product.kenmerken,
    listprijs: product.listprijs,
    korting_bedrag: kortingBedrag,
    prijs: calcFinalPrice(product.listprijs, kortingBedrag),
  };
}

export function parseKenmerken(kenmerken: string | null): string[] {
  if (!kenmerken) return [];
  return kenmerken.split('\n').map((s) => s.trim()).filter(Boolean);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Kon afbeelding niet laden'));
    };
    img.src = url;
  });
}

/** Resize & compress so localStorage / DB stays within limits */
export async function readImageAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Kies een afbeeldingsbestand (JPG, PNG, WebP).');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kon afbeelding niet verwerken');

  ctx.drawImage(img, 0, 0, width, height);

  const useJpeg = file.type === 'image/jpeg' || file.type === 'image/webp';
  return canvas.toDataURL(useJpeg ? 'image/jpeg' : 'image/png', useJpeg ? JPEG_QUALITY : undefined);
}
