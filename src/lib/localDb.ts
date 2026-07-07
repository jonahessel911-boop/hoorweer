import type { Lead, Order, TestResult, CallLog, Product } from './types';
import { normalizeOrder } from './orderDefaults';
import { normalizeLead } from './leadStatus';
import { defaultSeedProduct, normalizeProduct } from './productDefaults';
import { defaultTestLeads } from './testLeadSeed';

const STORAGE_KEY = 'hear-direct-db';
const CHANGE_EVENT = 'hear-direct-db-change';
const BC_CHANNEL = 'hear-direct-db-sync';
const DB_VERSION = 3;

const dbBroadcast =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BC_CHANNEL) : null;

const DEMO_LEAD_IDS = new Set([
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
]);

function emptyDbState(): DbState {
  return {
    leads: defaultTestLeads(),
    orders: [],
    callLogs: [],
    testResults: [],
    products: [defaultSeedProduct()],
  };
}

function ensureTestLead(state: DbState): DbState {
  const missing = defaultTestLeads().filter(
    (seed) => !state.leads.some((l) => l.id === seed.id)
  );
  if (missing.length > 0) {
    state.leads = [...missing, ...state.leads];
  }
  return state;
}

function stripDemoData(state: DbState): DbState {
  state.leads = (state.leads || []).filter((l) => !DEMO_LEAD_IDS.has(l.id));
  state.orders = (state.orders || []).filter((o) => !DEMO_LEAD_IDS.has(o.lead_id));
  state.testResults = (state.testResults || []).filter((r) => !DEMO_LEAD_IDS.has(r.lead_id));
  state.callLogs = (state.callLogs || []).filter((l) => !DEMO_LEAD_IDS.has(l.lead_id));
  return state;
}

function migrateState(state: DbState): DbState {
  const version = state.version ?? 1;
  let next: DbState = {
    ...state,
    leads: (state.leads || []).map((l) => normalizeLead(l as Lead)),
    orders: (state.orders || []).map((o) => normalizeOrder(o as Order)),
    testResults: state.testResults || [],
    callLogs: state.callLogs || [],
    products: (state.products || []).map((p) => normalizeProduct(p as Product)),
    version,
  };

  if (next.products.length === 0) {
    next.products = [defaultSeedProduct()];
  }

  if (version < DB_VERSION) {
    if (version < 2) {
      next = stripDemoData(next);
    }
    if (version < 3) {
      next = ensureTestLead(next);
    }
    next.version = DB_VERSION;
  }

  return next;
}

interface DbState {
  leads: Lead[];
  orders: Order[];
  testResults: TestResult[];
  callLogs: CallLog[];
  products: Product[];
  version?: number;
}

const LEAD_STATUS_RANK: Record<Lead['status'], number> = {
  nieuw: 0,
  contact_poging: 1,
  afgeboekt_geen_contact: 2,
  test_verzonden: 3,
  test_gestart: 4,
  test_afgerond: 5,
};

function generateId(): string {
  return crypto.randomUUID();
}

/** Read + migrate in memory — never writes to localStorage. */
function readState(): DbState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...emptyDbState(), version: DB_VERSION };
  }
  const parsed = JSON.parse(raw) as DbState;
  const migrated = migrateState(parsed);
  const leadsBefore = migrated.leads.length;
  const state = ensureTestLead(migrated);
  if (state.leads.length !== leadsBefore) {
    writeState(state);
  }
  return state;
}

function mergeLeads(a: Lead, b: Lead): Lead {
  const rankA = LEAD_STATUS_RANK[a.status] ?? 0;
  const rankB = LEAD_STATUS_RANK[b.status] ?? 0;
  const primary = rankB >= rankA ? b : a;
  const secondary = rankB >= rankA ? a : b;
  return normalizeLead({
    ...secondary,
    ...primary,
    contact_pogingen: Math.max(a.contact_pogingen, b.contact_pogingen),
    contact_uitkomst: primary.contact_uitkomst ?? secondary.contact_uitkomst,
    laatste_belpoging: primary.laatste_belpoging ?? secondary.laatste_belpoging,
  });
}

function mergeDbStates(incoming: DbState, latest: DbState): DbState {
  const leadsById = new Map<string, Lead>();
  for (const lead of latest.leads || []) leadsById.set(lead.id, normalizeLead(lead));
  for (const lead of incoming.leads || []) {
    const prev = leadsById.get(lead.id);
    leadsById.set(lead.id, prev ? mergeLeads(prev, lead) : normalizeLead(lead));
  }

  const resultKey = (r: TestResult) => `${r.lead_id}:${r.stap_nummer}`;
  const resultsByKey = new Map<string, TestResult>();
  for (const r of latest.testResults || []) resultsByKey.set(resultKey(r), r);
  for (const r of incoming.testResults || []) {
    const key = resultKey(r);
    const prev = resultsByKey.get(key);
    if (!prev || r.created_at >= prev.created_at) resultsByKey.set(key, r);
  }

  const ordersById = new Map<string, Order>();
  for (const o of latest.orders || []) ordersById.set(o.id, normalizeOrder(o));
  for (const o of incoming.orders || []) ordersById.set(o.id, normalizeOrder(o));

  const logsById = new Map<string, CallLog>();
  for (const l of latest.callLogs || []) logsById.set(l.id, l);
  for (const l of incoming.callLogs || []) logsById.set(l.id, l);

  const productsById = new Map<string, Product>();
  for (const p of latest.products || []) productsById.set(p.id, normalizeProduct(p));
  for (const p of incoming.products || []) productsById.set(p.id, normalizeProduct(p));

  const merged: DbState = {
    version: DB_VERSION,
    leads: [...leadsById.values()],
    testResults: [...resultsByKey.values()],
    orders: [...ordersById.values()],
    callLogs: [...logsById.values()],
    products: [...productsById.values()],
  };

  if (merged.products.length === 0) {
    merged.products = [defaultSeedProduct()];
  }

  return ensureTestLead(merged);
}

function initStorageIfNeeded(): DbState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const empty = { ...emptyDbState(), version: DB_VERSION };
    writeState(empty);
    return empty;
  }

  const parsed = JSON.parse(raw) as DbState;
  if ((parsed.version ?? 1) < DB_VERSION) {
    const migrated = ensureTestLead(migrateState(parsed));
    writeState(migrated);
    return migrated;
  }

  return readState();
}

function writeState(state: DbState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    dbBroadcast?.postMessage('change');
    return true;
  } catch (err) {
    console.error('HearDirect: localStorage save failed', err);
    return false;
  }
}

/** Load latest state, apply mutation, merge-save (safe across tabs). */
function load(): DbState {
  initStorageIfNeeded();
  return readState();
}

function save(incoming: DbState): boolean {
  initStorageIfNeeded();
  const latest = readState();
  return writeState(mergeDbStates(incoming, latest));
}

export function onLocalDbChange(callback: () => void): () => void {
  const handler = () => callback();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const bcHandler = () => callback();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  dbBroadcast?.addEventListener('message', bcHandler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
    dbBroadcast?.removeEventListener('message', bcHandler);
  };
}

type OrderUpdate = Partial<
  Pick<
    Order,
    | 'order_nummer'
    | 'status'
    | 'ondertekend_door'
    | 'ondertekend_op'
    | 'delivery_status'
    | 'land'
    | 'postcode'
    | 'huisnummer'
    | 'huisnummer_toevoeging'
    | 'straat'
    | 'plaats'
    | 'provincie'
    | 'signed_offer_pdf'
    | 'signature_image'
    | 'aangekomen_op'
    | 'bedenktijd_dagen'
    | 'netto_sale_op'
    | 'cancelled_op'
    | 'cancelled_from'
  >
>;

export const localDb = {
  getLeads(): Lead[] {
    return [...load().leads].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getLeadById(id: string): Lead | null {
    return load().leads.find((l) => l.id === id) ?? null;
  },

  getLeadByToken(token: string): Lead | null {
    return load().leads.find((l) => l.test_token === token) ?? null;
  },

  upsertLead(lead: Lead): void {
    const state = load();
    const normalized = normalizeLead(lead);
    const idx = state.leads.findIndex((l) => l.id === normalized.id);
    if (idx >= 0) {
      state.leads[idx] = mergeLeads(state.leads[idx], normalized);
    } else {
      state.leads.push(normalized);
    }
    save(state);
  },

  createLead(data: { naam: string; telefoon: string; email: string | null }): Lead {
    const state = load();
    const lead: Lead = {
      id: generateId(),
      naam: data.naam,
      telefoon: data.telefoon,
      email: data.email,
      test_token: generateId(),
      status: 'nieuw',
      contact_pogingen: 0,
      contact_uitkomst: null,
      laatste_belpoging: null,
      created_at: new Date().toISOString(),
    };
    state.leads.push(lead);
    save(state);
    return lead;
  },

  updateLead(
    id: string,
    updates: Partial<Pick<Lead, 'status' | 'email' | 'contact_pogingen' | 'contact_uitkomst' | 'laatste_belpoging'>>
  ): Lead | null {
    const state = load();
    const idx = state.leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    state.leads[idx] = { ...state.leads[idx], ...updates };
    save(state);
    return state.leads[idx];
  },

  getOrders(): Order[] {
    return [...load().orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getOrderById(id: string): Order | null {
    const order = load().orders.find((o) => o.id === id);
    return order ? normalizeOrder(order) : null;
  },

  getOrdersByLeadId(leadId: string): Order[] {
    return load().orders
      .filter((o) => o.lead_id === leadId)
      .map((o) => normalizeOrder(o))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getOrderByToken(token: string): Order | null {
    const orders = load().orders;
    const byToken = orders.find((o) => o.offerte_token === token);
    if (byToken) return normalizeOrder(byToken);
    const byId = orders.find((o) => o.id === token);
    return byId ? normalizeOrder(byId) : null;
  },

  upsertOrder(order: Order): void {
    const state = load();
    const normalized = normalizeOrder(order);
    const idx = state.orders.findIndex((o) => o.id === normalized.id);
    if (idx >= 0) {
      state.orders[idx] = normalized;
    } else {
      state.orders.push(normalized);
    }
    save(state);
  },

  createOrder(data: {
    lead_id: string;
    product_id: string | null;
    productnaam: string;
    product_model: string | null;
    product_beschrijving: string | null;
    product_image_url: string | null;
    product_kenmerken: string | null;
    listprijs: number;
    korting_bedrag: number;
    prijs: number;
  }): Order {
    const state = load();
    const order = normalizeOrder({
      id: generateId(),
      order_nummer: null,
      ...data,
      offerte_token: generateId(),
      status: 'offerte_aangemaakt',
      delivery_status: 'offerte',
      land: 'Nederland',
      postcode: null,
      huisnummer: null,
      huisnummer_toevoeging: null,
      straat: null,
      plaats: null,
      provincie: null,
      ondertekend_door: null,
      ondertekend_op: null,
      signature_image: null,
      signed_offer_pdf: null,
      aangekomen_op: null,
      bedenktijd_dagen: 30,
      netto_sale_op: null,
      cancelled_op: null,
      cancelled_from: null,
      created_at: new Date().toISOString(),
    });
    state.orders.push(order);
    if (!save(state)) {
      state.orders.pop();
      throw new Error(
        'Offerte kon niet worden opgeslagen. Browseropslag is mogelijk vol — verwijder oude data of gebruik een kleinere productfoto.'
      );
    }
    return order;
  },

  updateOrder(id: string, updates: OrderUpdate): Order | null {
    const state = load();
    const idx = state.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    state.orders[idx] = normalizeOrder({ ...state.orders[idx], ...updates });
    save(state);
    return state.orders[idx];
  },

  getTestResults(leadId: string): TestResult[] {
    return load().testResults
      .filter((r) => r.lead_id === leadId)
      .sort((a, b) => a.stap_nummer - b.stap_nummer);
  },

  upsertTestResult(result: TestResult): void {
    const state = load();
    state.testResults = state.testResults || [];
    const existingIdx = state.testResults.findIndex(
      (r) => r.lead_id === result.lead_id && r.stap_nummer === result.stap_nummer
    );
    if (existingIdx >= 0) {
      state.testResults[existingIdx] = result;
    } else {
      state.testResults.push(result);
    }
    save(state);
  },

  createTestResult(data: Omit<TestResult, 'id' | 'created_at'>): TestResult {
    const state = load();
    const result: TestResult = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    state.testResults = state.testResults || [];
    const existingIdx = state.testResults.findIndex(
      (r) => r.lead_id === data.lead_id && r.stap_nummer === data.stap_nummer
    );
    if (existingIdx >= 0) {
      state.testResults[existingIdx] = result;
    } else {
      state.testResults.push(result);
    }
    if (!save(state)) {
      throw new Error('Kon testresultaat niet opslaan.');
    }
    return result;
  },

  getCallLogs(leadId: string): CallLog[] {
    return load()
      .callLogs.filter((l) => l.lead_id === leadId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getAllCallLogs(): CallLog[] {
    return [...load().callLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  createCallLog(data: Omit<CallLog, 'id' | 'created_at'>): CallLog {
    const state = load();
    const log: CallLog = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    state.callLogs.push(log);
    save(state);
    return log;
  },

  getProducts(): Product[] {
    return [...load().products]
      .map((p) => normalizeProduct(p))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getProductById(id: string): Product | null {
    const p = load().products.find((x) => x.id === id);
    return p ? normalizeProduct(p) : null;
  },

  createProduct(data: Omit<Product, 'id' | 'created_at'>): Product {
    const state = load();
    const product = normalizeProduct({
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    });
    state.products.push(product);
    save(state);
    return product;
  },

  updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Product | null {
    const state = load();
    const idx = state.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    state.products[idx] = normalizeProduct({ ...state.products[idx], ...updates });
    save(state);
    return state.products[idx];
  },

  deleteProduct(id: string): boolean {
    const state = load();
    const before = state.products.length;
    state.products = state.products.filter((p) => p.id !== id);
    if (state.products.length === before) return false;
    save(state);
    return true;
  },
};
