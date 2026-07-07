import { supabase } from './supabase';
import { isSupabaseConfigured } from './config';
import { localDb, onLocalDbChange } from './localDb';
import { normalizeOrder, nextOrderNumber } from './orderDefaults';
import { normalizeLead } from './leadStatus';
import { normalizeProduct } from './productDefaults';
import type { Lead, Order, TestResult, CallLog, Product } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

let useLocalMode: boolean | null = null;

const changeSubscribers = new Set<() => void>();
let sharedRealtimeChannel: RealtimeChannel | null = null;

function notifyChangeSubscribers() {
  changeSubscribers.forEach((callback) => callback());
}

function shouldUseLocal(): boolean {
  if (useLocalMode !== null) return useLocalMode;
  useLocalMode = !isSupabaseConfigured();
  return useLocalMode;
}

function isFetchError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.includes('fetch')) return true;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: string }).message);
    return msg.includes('fetch') || msg.includes('Failed to fetch');
  }
  return false;
}

function switchToLocal(): void {
  useLocalMode = true;
}

async function syncLeadToSupabase(lead: Lead): Promise<string | null> {
  const { error } = await supabase.from('leads').upsert(
    {
      id: lead.id,
      naam: lead.naam,
      telefoon: lead.telefoon,
      email: lead.email,
      test_token: lead.test_token,
      status: lead.status,
      contact_pogingen: lead.contact_pogingen,
      contact_uitkomst: lead.contact_uitkomst,
      laatste_belpoging: lead.laatste_belpoging,
      created_at: lead.created_at,
    },
    { onConflict: 'id' }
  );
  return error ? error.message : null;
}

function mergeTestResults(local: TestResult[], remote: TestResult[]): TestResult[] {
  const byStap = new Map<number, TestResult>();
  for (const row of local) byStap.set(row.stap_nummer, row);
  for (const row of remote) {
    const prev = byStap.get(row.stap_nummer);
    if (!prev || row.created_at >= prev.created_at) {
      byStap.set(row.stap_nummer, row);
    }
  }
  return [...byStap.values()].sort((a, b) => a.stap_nummer - b.stap_nummer);
}

function findLocalLeadByTokenOrId(tokenOrId: string): Lead | null {
  return localDb.getLeadByToken(tokenOrId) ?? localDb.getLeadById(tokenOrId);
}

async function fetchLeadFromSupabaseByTokenOrId(
  tokenOrId: string
): Promise<{ data: Lead | null; error: unknown }> {
  const { data: byToken, error: tokenError } = await supabase
    .from('leads')
    .select('*')
    .eq('test_token', tokenOrId)
    .maybeSingle();

  if (tokenError) return { data: null, error: tokenError };
  if (byToken) return { data: normalizeLead(byToken as Lead), error: null };

  const { data: byId, error: idError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', tokenOrId)
    .maybeSingle();

  if (idError) return { data: null, error: idError };
  if (byId) return { data: normalizeLead(byId as Lead), error: null };

  return { data: null, error: null };
}

export { isSupabaseConfigured } from './config';

export function subscribeToChanges(callback: () => void): () => void {
  const unsubscribeLocal = onLocalDbChange(callback);

  if (shouldUseLocal()) {
    return unsubscribeLocal;
  }

  changeSubscribers.add(callback);

  if (!sharedRealtimeChannel) {
    sharedRealtimeChannel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, notifyChangeSubscribers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, notifyChangeSubscribers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_results' }, notifyChangeSubscribers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, notifyChangeSubscribers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, notifyChangeSubscribers)
      .subscribe();
  }

  return () => {
    unsubscribeLocal();
    changeSubscribers.delete(callback);
    if (changeSubscribers.size === 0 && sharedRealtimeChannel) {
      supabase.removeChannel(sharedRealtimeChannel);
      sharedRealtimeChannel = null;
    }
  };
}

// ——— Leads ———

export async function fetchLeads(): Promise<{ data: Lead[] | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getLeads(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchLeads();
      }
      return { data: null, error: error.message };
    }
    return { data: (data || []).map((l) => normalizeLead(l as Lead)), error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchLeads();
    }
    return { data: null, error: 'Kon gegevens niet laden' };
  }
}

export async function fetchLeadById(id: string): Promise<{ data: Lead | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getLeadById(id), error: null };
  }

  try {
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchLeadById(id);
      }
      return { data: null, error: error.message };
    }
    if (data) {
      const lead = normalizeLead(data as Lead);
      localDb.upsertLead(lead);
      return { data: lead, error: null };
    }
    return { data: null, error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchLeadById(id);
    }
    return { data: null, error: 'Kon lead niet laden' };
  }
}

export async function fetchLeadByToken(token: string): Promise<{ data: Lead | null; error: string | null }> {
  const tokenOrId = token.trim();
  const cached = findLocalLeadByTokenOrId(tokenOrId);

  if (!isSupabaseConfigured()) {
    return { data: cached, error: null };
  }

  try {
    const { data: lead, error } = await fetchLeadFromSupabaseByTokenOrId(tokenOrId);

    if (error) {
      if (isFetchError(error)) {
        return { data: cached, error: null };
      }
      return { data: cached, error: (error as { message: string }).message };
    }

    if (lead) {
      localDb.upsertLead(lead);
      return { data: lead, error: null };
    }

    return { data: cached, error: null };
  } catch (err) {
    if (isFetchError(err)) {
      return { data: cached, error: null };
    }
    return { data: cached, error: 'Kon lead niet laden' };
  }
}

export async function createLead(data: {
  naam: string;
  telefoon: string;
  email: string | null;
}): Promise<{ data: Lead | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.createLead(data), error: null };
  }

  try {
    const test_token = crypto.randomUUID();
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        naam: data.naam,
        telefoon: data.telefoon,
        email: data.email,
        test_token,
        status: 'nieuw',
        contact_pogingen: 0,
      })
      .select()
      .single();

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return createLead(data);
      }
      return { data: null, error: error.message };
    }
    if (!lead) {
      return { data: null, error: 'Kon lead niet aanmaken' };
    }
    const normalized = normalizeLead(lead as Lead);
    localDb.upsertLead(normalized);
    return { data: normalized, error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return createLead(data);
    }
    return { data: null, error: 'Kon lead niet aanmaken' };
  }
}

export async function updateLead(
  id: string,
  updates: Partial<Pick<Lead, 'status' | 'email' | 'contact_pogingen' | 'contact_uitkomst' | 'laatste_belpoging'>>
): Promise<{ error: string | null }> {
  const updated = localDb.updateLead(id, updates);
  if (!updated) {
    const existing = localDb.getLeadById(id);
    if (!existing) {
      return { error: 'Lead niet gevonden' };
    }
    localDb.upsertLead({ ...existing, ...updates });
  }

  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  const lead = localDb.getLeadById(id);
  if (!lead) {
    return { error: 'Lead niet gevonden' };
  }

  const syncErr = await syncLeadToSupabase(lead);
  return syncErr ? { error: syncErr } : { error: null };
}

// ——— Orders ———

export async function fetchOrders(): Promise<{ data: Order[] | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getOrders(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchOrders();
      }
      return { data: null, error: error.message };
    }
    return { data: (data || []).map((o) => normalizeOrder(o)), error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchOrders();
    }
    return { data: null, error: 'Kon orders niet laden' };
  }
}

export async function fetchOrdersByLeadId(leadId: string): Promise<{ data: Order[]; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getOrdersByLeadId(leadId), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchOrdersByLeadId(leadId);
      }
      return { data: [], error: error.message };
    }
    return { data: (data || []).map((o) => normalizeOrder(o)), error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchOrdersByLeadId(leadId);
    }
    return { data: [], error: 'Kon orders niet laden' };
  }
}

export async function fetchOrderById(id: string): Promise<{ data: Order | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getOrderById(id), error: null };
  }

  try {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchOrderById(id);
      }
      return { data: null, error: error.message };
    }
    return { data: data ? normalizeOrder(data) : null, error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchOrderById(id);
    }
    return { data: null, error: 'Kon order niet laden' };
  }
}

export async function fetchOrderByToken(token: string): Promise<{ data: Order | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getOrderByToken(token), error: null };
  }

  async function queryByField(field: 'offerte_token' | 'id') {
    const { data, error } = await supabase.from('orders').select('*').eq(field, token).maybeSingle();
    return { data: data ? normalizeOrder(data) : null, error };
  }

  try {
    let { data, error } = await queryByField('offerte_token');
    if (!data && !error) {
      ({ data, error } = await queryByField('id'));
    }

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchOrderByToken(token);
      }
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchOrderByToken(token);
    }
    return { data: null, error: 'Kon order niet laden' };
  }
}

export type CreateOrderInput = {
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
};

export async function createOrder(data: CreateOrderInput): Promise<{ data: Order | null; error: string | null }> {
  if (shouldUseLocal()) {
    try {
      return { data: localDb.createOrder(data), error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Kon order niet aanmaken',
      };
    }
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        ...data,
        status: 'offerte_aangemaakt',
        delivery_status: 'offerte',
        land: 'Nederland',
        bedenktijd_dagen: 30,
      })
      .select()
      .single();

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return createOrder(data);
      }
      return { data: null, error: error.message };
    }
    return { data: order ? normalizeOrder(order) : null, error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return createOrder(data);
    }
    return { data: null, error: 'Kon order niet aanmaken' };
  }
}

export type OrderUpdate = Partial<
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

export interface SignOrderData {
  ondertekend_door: string;
  land: string;
  postcode: string;
  huisnummer: string;
  huisnummer_toevoeging: string | null;
  straat: string;
  plaats: string;
  provincie: string;
  signed_offer_pdf: string;
  signature_image: string | null;
}

export async function signOrder(
  id: string,
  data: SignOrderData
): Promise<{ error: string | null }> {
  const orderNummer = nextOrderNumber();
  const now = new Date().toISOString();

  return updateOrder(id, {
    order_nummer: orderNummer,
    status: 'ondertekend',
    ondertekend_door: data.ondertekend_door,
    ondertekend_op: now,
    delivery_status: 'aangemaakt',
    land: data.land,
    postcode: data.postcode,
    huisnummer: data.huisnummer,
    huisnummer_toevoeging: data.huisnummer_toevoeging,
    straat: data.straat,
    plaats: data.plaats,
    provincie: data.provincie,
    signed_offer_pdf: data.signed_offer_pdf,
    signature_image: data.signature_image,
  });
}

export async function updateOrder(id: string, updates: OrderUpdate): Promise<{ error: string | null }> {
  if (shouldUseLocal()) {
    const updated = localDb.updateOrder(id, updates);
    return updated ? { error: null } : { error: 'Order niet gevonden' };
  }

  try {
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return updateOrder(id, updates);
      }
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return updateOrder(id, updates);
    }
    return { error: 'Kon order niet bijwerken' };
  }
}

// ——— Products ———

export async function fetchProducts(): Promise<{ data: Product[] | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getProducts(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchProducts();
      }
      return { data: null, error: error.message };
    }
    return { data: (data || []).map((p) => normalizeProduct(p as Product)), error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchProducts();
    }
    return { data: null, error: 'Kon producten niet laden' };
  }
}

export async function createProduct(
  data: Omit<Product, 'id' | 'created_at'>
): Promise<{ data: Product | null; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.createProduct(data), error: null };
  }

  try {
    const { data: product, error } = await supabase.from('products').insert(data).select().single();
    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return createProduct(data);
      }
      return { data: null, error: error.message };
    }
    return { data: product ? normalizeProduct(product as Product) : null, error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return createProduct(data);
    }
    return { data: null, error: 'Kon product niet aanmaken' };
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<{ error: string | null }> {
  if (shouldUseLocal()) {
    localDb.updateProduct(id, updates);
    return { error: null };
  }

  try {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return updateProduct(id, updates);
      }
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return updateProduct(id, updates);
    }
    return { error: 'Kon product niet bijwerken' };
  }
}

export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  if (shouldUseLocal()) {
    localDb.deleteProduct(id);
    return { error: null };
  }

  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return deleteProduct(id);
      }
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return deleteProduct(id);
    }
    return { error: 'Kon product niet verwijderen' };
  }
}

// ——— Test results ———

export async function fetchTestResults(leadId: string): Promise<{ data: TestResult[]; error: string | null }> {
  const local = localDb.getTestResults(leadId);

  if (!isSupabaseConfigured()) {
    return { data: local, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('lead_id', leadId)
      .order('stap_nummer', { ascending: true });

    if (error) {
      if (isFetchError(error)) {
        return { data: local, error: null };
      }
      return { data: local, error: error.message };
    }

    const remote = (data || []) as TestResult[];
    for (const row of remote) {
      localDb.upsertTestResult(row);
    }
    return { data: mergeTestResults(local, remote), error: null };
  } catch (err) {
    if (isFetchError(err)) {
      return { data: local, error: null };
    }
    return { data: local, error: 'Kon testresultaten niet laden' };
  }
}

export async function createTestResult(
  data: Omit<TestResult, 'id' | 'created_at'>
): Promise<{ error: string | null }> {
  let result: TestResult;
  try {
    result = localDb.createTestResult(data);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Kon testresultaat niet opslaan',
    };
  }

  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  const lead = localDb.getLeadById(data.lead_id);
  if (!lead) {
    return { error: 'Lead niet gevonden. Vernieuw de pagina en probeer opnieuw.' };
  }

  const syncErr = await syncLeadToSupabase(lead);
  if (syncErr) {
    return { error: `Lead sync mislukt: ${syncErr}` };
  }

  try {
    await supabase
      .from('test_results')
      .delete()
      .eq('lead_id', data.lead_id)
      .eq('stap_nummer', data.stap_nummer);

    const { error } = await supabase.from('test_results').insert({
      id: result.id,
      lead_id: data.lead_id,
      stap_nummer: data.stap_nummer,
      type: data.type,
      frequentie: data.frequentie,
      oor: data.oor,
      antwoord: data.antwoord,
      created_at: result.created_at,
    });

    if (error) {
      if (isFetchError(error)) {
        return { error: 'Kon geen verbinding maken met Supabase. Probeer opnieuw.' };
      }
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    if (isFetchError(err)) {
      return { error: 'Kon geen verbinding maken met Supabase. Probeer opnieuw.' };
    }
    return { error: 'Kon testresultaat niet opslaan' };
  }
}

// ——— Call logs ———

export async function fetchAllCallLogs(): Promise<{ data: CallLog[]; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getAllCallLogs(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchAllCallLogs();
      }
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchAllCallLogs();
    }
    return { data: [], error: 'Kon belgeschiedenis niet laden' };
  }
}

export async function fetchCallLogs(leadId: string): Promise<{ data: CallLog[]; error: string | null }> {
  if (shouldUseLocal()) {
    return { data: localDb.getCallLogs(leadId), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return fetchCallLogs(leadId);
      }
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return fetchCallLogs(leadId);
    }
    return { data: [], error: 'Kon belgeschiedenis niet laden' };
  }
}

export async function createCallLog(
  data: Omit<CallLog, 'id' | 'created_at'>
): Promise<{ error: string | null }> {
  if (shouldUseLocal()) {
    localDb.createCallLog(data);
    return { error: null };
  }

  try {
    const { error } = await supabase.from('call_logs').insert({
      lead_id: data.lead_id,
      uitkomst: data.uitkomst,
      telt_mee: data.telt_mee,
      notitie: data.notitie,
    });

    if (error) {
      if (isFetchError(error)) {
        switchToLocal();
        return createCallLog(data);
      }
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    if (isFetchError(err)) {
      switchToLocal();
      return createCallLog(data);
    }
    return { error: 'Kon belpoging niet opslaan' };
  }
}
