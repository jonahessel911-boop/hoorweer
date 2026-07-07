import type { Connect } from 'vite';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export interface LeadWebhookInput {
  naam: string;
  email: string;
  telefoon: string;
}

export interface LeadWebhookEnv {
  supabaseUrl?: string;
  supabaseKey?: string;
  webhookSecret?: string;
  appUrl?: string;
}

export function parseLeadWebhookBody(body: unknown): LeadWebhookInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Ongeldige JSON-body.');
  }

  const record = body as Record<string, unknown>;
  const naam = String(record.naam ?? record.name ?? '').trim();
  const email = String(record.email ?? '').trim();
  const telefoon = String(record.telefoon ?? record.phone ?? record.telefoonnummer ?? '').trim();

  if (!naam) {
    throw new Error('Veld "naam" is verplicht.');
  }
  if (!email) {
    throw new Error('Veld "email" is verplicht.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Ongeldig e-mailadres.');
  }
  if (!telefoon) {
    throw new Error('Veld "telefoon" is verplicht.');
  }

  return { naam, email, telefoon };
}

export function isWebhookAuthorized(
  req: Connect.IncomingMessage,
  secret: string
): boolean {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7) === secret;
  }
  const headerSecret = req.headers['x-webhook-secret'];
  return typeof headerSecret === 'string' && headerSecret === secret;
}

export async function insertLeadInSupabase(
  env: LeadWebhookEnv,
  input: LeadWebhookInput
): Promise<{ id: string; test_token: string; created_at: string }> {
  if (!env.supabaseUrl || !env.supabaseKey) {
    throw new Error('Supabase is niet geconfigureerd op de server.');
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const test_token = randomUUID();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      naam: input.naam,
      email: input.email,
      telefoon: input.telefoon,
      test_token,
      status: 'nieuw',
    })
    .select('id, test_token, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Lead kon niet worden aangemaakt.');
  }

  return data;
}

export function buildTestUrl(appUrl: string, testToken: string): string {
  const base = appUrl.replace(/\/$/, '');
  return `${base}/test/${testToken}`;
}
