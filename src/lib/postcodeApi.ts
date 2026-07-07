export interface PostcodeResult {
  street: string;
  city: string;
  house_number: string;
  zip_code: string;
  province: string;
  longitude: number;
  latitude: number;
}

export async function lookupAddress(
  postcode: string,
  huisnummer: string,
  toevoeging?: string
): Promise<PostcodeResult> {
  const pc = postcode.replace(/\s/g, '').toUpperCase();
  const params = new URLSearchParams({
    postcode: pc,
    number: huisnummer.trim(),
  });
  if (toevoeging?.trim()) {
    params.set('addition', toevoeging.trim());
  }

  let res: Response;
  try {
    res = await fetch(`/api/postcode?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('Kon geen verbinding maken met de adres-API. Probeer het later opnieuw.');
  }

  const data = (await res.json()) as PostcodeResult & { error?: string };

  if (!res.ok) {
    throw new Error(data.error || 'Adres niet gevonden. Controleer postcode en huisnummer.');
  }

  if (!data.street) {
    throw new Error('Adres niet gevonden. Controleer postcode en huisnummer.');
  }

  return data;
}
