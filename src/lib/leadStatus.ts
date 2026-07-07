import type { CallLog, ContactUitkomst, Lead, LeadStatus } from './types';

export const MAX_CONTACT_ATTEMPTS = 7;
export const MAX_CONTACT_ATTEMPTS_PER_DAY = 2;

const LEGACY_STATUS_MAP: Record<string, LeadStatus> = {
  aangemaakt: 'nieuw',
  verzonden: 'test_verzonden',
};

export function normalizeLead(lead: Lead): Lead {
  const status = (LEGACY_STATUS_MAP[lead.status] ?? lead.status) as LeadStatus;
  return {
    ...lead,
    status,
    contact_pogingen: lead.contact_pogingen ?? 0,
    contact_uitkomst: lead.contact_uitkomst ?? null,
    laatste_belpoging: lead.laatste_belpoging ?? null,
  };
}

export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function getTodayCountingAttempts(logs: CallLog[]): number {
  return logs.filter((l) => l.telt_mee && isToday(l.created_at)).length;
}

export function canCountAttemptToday(logs: CallLog[]): boolean {
  return getTodayCountingAttempts(logs) < MAX_CONTACT_ATTEMPTS_PER_DAY;
}

export interface NoContactResult {
  leadUpdates: Partial<Lead>;
  teltMee: boolean;
  callLog: Omit<CallLog, 'id' | 'created_at'>;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nieuw: 'Aangemaakt',
  contact_poging: 'Contact poging',
  afgeboekt_geen_contact: 'Geen contact mogelijk',
  test_verzonden: 'Test verzonden',
  test_gestart: 'Test gestart',
  test_afgerond: 'Test afgerond',
};

export const CONTACT_UITKOMST_LABELS: Record<ContactUitkomst, string> = {
  terugbellen: 'Geïnteresseerd — terugbellen later',
  deal: 'Geïnteresseerd — deal',
  geen_interesse: 'Geen interesse',
};

export function getLeadDisplayLabel(lead: Lead): string {
  const normalized = normalizeLead(lead);
  if (normalized.status === 'contact_poging') {
    return `Contact poging ${normalized.contact_pogingen} (${normalized.contact_pogingen}/${MAX_CONTACT_ATTEMPTS})`;
  }
  if (normalized.contact_uitkomst) {
    return CONTACT_UITKOMST_LABELS[normalized.contact_uitkomst];
  }
  return LEAD_STATUS_LABELS[normalized.status];
}

export function isLeadClosed(lead: Lead): boolean {
  const normalized = normalizeLead(lead);
  return (
    normalized.status === 'afgeboekt_geen_contact' ||
    normalized.contact_uitkomst === 'geen_interesse'
  );
}

export function canRegisterContact(lead: Lead): boolean {
  const normalized = normalizeLead(lead);
  if (isLeadClosed(normalized)) return false;
  if (normalized.contact_uitkomst) return false;
  if (normalized.status === 'test_gestart' || normalized.status === 'test_afgerond') return false;
  return true;
}

export function canSendTestLink(lead: Lead): boolean {
  const normalized = normalizeLead(lead);
  if (normalized.contact_uitkomst === 'terugbellen' || normalized.contact_uitkomst === 'deal') {
    return normalized.status !== 'test_afgerond';
  }
  return normalized.status === 'nieuw' || normalized.status === 'test_verzonden';
}

export function isTestStarted(lead: Lead): boolean {
  const normalized = normalizeLead(lead);
  return normalized.status === 'test_gestart' || normalized.status === 'test_afgerond';
}

export function isTestComplete(lead: Lead): boolean {
  return normalizeLead(lead).status === 'test_afgerond';
}

export function registerNoContact(lead: Lead, logs: CallLog[]): NoContactResult {
  const normalized = normalizeLead(lead);
  const now = new Date().toISOString();
  const teltMee = canCountAttemptToday(logs);
  const callLog: Omit<CallLog, 'id' | 'created_at'> = {
    lead_id: lead.id,
    uitkomst: 'geen_bereik',
    telt_mee: teltMee,
    notitie: null,
  };

  if (!teltMee) {
    return {
      leadUpdates: { laatste_belpoging: now },
      teltMee: false,
      callLog,
    };
  }

  const nextAttempt = normalized.contact_pogingen + 1;
  if (nextAttempt >= MAX_CONTACT_ATTEMPTS) {
    return {
      leadUpdates: {
        contact_pogingen: MAX_CONTACT_ATTEMPTS,
        status: 'afgeboekt_geen_contact',
        laatste_belpoging: now,
      },
      teltMee: true,
      callLog,
    };
  }
  return {
    leadUpdates: {
      contact_pogingen: nextAttempt,
      status: 'contact_poging',
      laatste_belpoging: now,
    },
    teltMee: true,
    callLog,
  };
}

export function registerContactOutcome(
  lead: Lead,
  uitkomst: ContactUitkomst
): { leadUpdates: Partial<Lead>; callLog: Omit<CallLog, 'id' | 'created_at'> } {
  const callUitkomst: CallLog['uitkomst'] =
    uitkomst === 'terugbellen'
      ? 'bel_later_terug'
      : uitkomst === 'deal'
        ? 'deal'
        : 'geen_interesse';

  return {
    leadUpdates: {
      contact_uitkomst: uitkomst,
      laatste_belpoging: new Date().toISOString(),
    },
    callLog: {
      lead_id: lead.id,
      uitkomst: callUitkomst,
      telt_mee: false,
      notitie: null,
    },
  };
}

export type PipelineStepKey = 'nieuw' | 'contact' | 'terugbellen' | 'deal' | 'geen_interesse';

export type PipelineStepState = 'done' | 'current' | 'pending' | 'failed';

export interface PipelineStep {
  key: PipelineStepKey;
  label: string;
  state: PipelineStepState;
}

export function getLeadPipeline(lead: Lead): PipelineStep[] {
  const normalized = normalizeLead(lead);
  const { status, contact_pogingen, contact_uitkomst } = normalized;
  const afgeboekt = status === 'afgeboekt_geen_contact';
  const hasContact = Boolean(contact_uitkomst);
  const pastContact = hasContact || afgeboekt || status === 'test_verzonden' || status === 'test_gestart' || status === 'test_afgerond';

  const contactLabel = afgeboekt
    ? `Afgeboekt (${MAX_CONTACT_ATTEMPTS}/${MAX_CONTACT_ATTEMPTS})`
    : contact_pogingen > 0
      ? `Contact poging ${contact_pogingen} (${contact_pogingen}/${MAX_CONTACT_ATTEMPTS})`
      : 'Contact poging (0/7)';

  function outcomeState(key: ContactUitkomst): PipelineStepState {
    if (contact_uitkomst === key) return 'current';
    return 'pending';
  }

  function contactStepState(): PipelineStepState {
    if (afgeboekt) return 'failed';
    if (status === 'contact_poging') return 'current';
    if (status === 'nieuw' && contact_pogingen === 0 && !hasContact) return 'pending';
    if (pastContact) return 'done';
    return 'pending';
  }

  return [
    {
      key: 'nieuw',
      label: 'Aangemaakt',
      state: contact_pogingen > 0 || pastContact ? 'done' : status === 'nieuw' ? 'current' : 'pending',
    },
    {
      key: 'contact',
      label: contactLabel,
      state: contactStepState(),
    },
    {
      key: 'terugbellen',
      label: CONTACT_UITKOMST_LABELS.terugbellen,
      state: outcomeState('terugbellen'),
    },
    {
      key: 'deal',
      label: CONTACT_UITKOMST_LABELS.deal,
      state: outcomeState('deal'),
    },
    {
      key: 'geen_interesse',
      label: CONTACT_UITKOMST_LABELS.geen_interesse,
      state: outcomeState('geen_interesse'),
    },
  ];
}
