import type { Connect } from 'vite';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

function createHandler(apiKey: string | undefined): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/postcode')) {
      return next();
    }

    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error:
            'POSTCODE_API_KEY ontbreekt. Voeg je api-postcode.nl token toe aan .env.local.',
        })
      );
      return;
    }

    try {
      const url = new URL(req.url, 'http://localhost');
      const postcode = url.searchParams.get('postcode')?.replace(/\s/g, '').toUpperCase();
      const number = url.searchParams.get('number')?.trim();
      const addition = url.searchParams.get('addition')?.trim();

      if (!postcode || !number) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Postcode en huisnummer zijn verplicht.' }));
        return;
      }

      const houseNumber = addition ? `${number}-${addition}` : number;
      const apiUrl = `https://json.api-postcode.nl?postcode=${encodeURIComponent(postcode)}&number=${encodeURIComponent(houseNumber)}`;

      const apiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Token: apiKey,
        },
      });

      const data = (await apiRes.json()) as Record<string, unknown>;

      if (!apiRes.ok) {
        const message =
          typeof data.error === 'string'
            ? data.error
            : 'Adres niet gevonden. Controleer postcode en huisnummer.';
        res.statusCode = apiRes.status === 404 ? 404 : 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: message }));
        return;
      }

      if (!data.street) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Adres niet gevonden. Controleer postcode en huisnummer.' }));
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          street: data.street,
          city: data.city,
          house_number: data.house_number ?? houseNumber,
          zip_code: data.postcode ?? postcode,
          province: data.province ?? '',
          longitude: data.longitude ?? 0,
          latitude: data.latitude ?? 0,
        })
      );
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Adres opzoeken mislukt',
        })
      );
    }
  };
}

export function postcodeApiPlugin(): Plugin {
  return {
    name: 'postcode-api-proxy',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      const apiKey = env.POSTCODE_API_KEY || env.VITE_POSTCODE_API_KEY;
      server.middlewares.use(createHandler(apiKey));
    },
    configurePreviewServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      const apiKey = env.POSTCODE_API_KEY || env.VITE_POSTCODE_API_KEY;
      server.middlewares.use(createHandler(apiKey));
    },
  };
}
