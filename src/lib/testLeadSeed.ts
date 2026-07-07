import type { Lead } from './types';

export const TEST_LEAD_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const TEST_LEAD_TOKEN = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

export const TEST_LEAD_2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const TEST_LEAD_2_TOKEN = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

export const TEST_LEAD_IDS = [TEST_LEAD_ID, TEST_LEAD_2_ID] as const;

export function defaultTestLead(): Lead {
  return {
    id: TEST_LEAD_ID,
    naam: 'Test Klant',
    telefoon: '06-00000001',
    email: 'test@hear-direct.nl',
    test_token: TEST_LEAD_TOKEN,
    status: 'nieuw',
    contact_pogingen: 0,
    contact_uitkomst: null,
    laatste_belpoging: null,
    created_at: new Date().toISOString(),
  };
}

export function defaultTestLead2(): Lead {
  return {
    id: TEST_LEAD_2_ID,
    naam: 'Test Klant 2',
    telefoon: '06-00000002',
    email: 'test2@hear-direct.nl',
    test_token: TEST_LEAD_2_TOKEN,
    status: 'nieuw',
    contact_pogingen: 0,
    contact_uitkomst: null,
    laatste_belpoging: null,
    created_at: new Date().toISOString(),
  };
}

export function defaultTestLeads(): Lead[] {
  return [defaultTestLead(), defaultTestLead2()];
}
