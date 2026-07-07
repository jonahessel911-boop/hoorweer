import type { CallLog, CallUitkomst, Lead } from './types';
import { MAX_CONTACT_ATTEMPTS, normalizeLead, isToday, LEAD_STATUS_LABELS, isTestStarted, isTestComplete } from './leadStatus';

export type CallScreenOutcome = 'geen_gehoor' | 'voicemail' | 'testlink_verstuurd' | 'bel_later_terug';

export const CALL_SCREEN_OUTCOME_LABELS: Record<CallScreenOutcome, string> = {
  geen_gehoor: 'Geen gehoor',
  voicemail: 'Voicemail ingesproken',
  testlink_verstuurd: 'Bereikt — testlink verstuurd',
  bel_later_terug: 'Bereikt — bel later terug',
};

export const CALL_UITKOMST_LABELS: Record<CallUitkomst, string> = {
  geen_bereik: 'Geen bereik',
  geen_gehoor: 'Geen gehoor',
  voicemail: 'Voicemail ingesproken',
  testlink_verstuurd: 'Testlink verstuurd',
  bel_later_terug: 'Terugbellen later',
  deal: 'Deal',
  geen_interesse: 'Geen interesse',
};

const REACHED_UITKOMSTEN: CallUitkomst[] = [
  'testlink_verstuurd',
  'bel_later_terug',
  'deal',
  'geen_interesse',
];

export function isReachedUitkomst(uitkomst: CallUitkomst): boolean {
  return REACHED_UITKOMSTEN.includes(uitkomst);
}

/** Leads die nog gebeld moeten worden (nieuw of contact_poging, max 7 pogingen). */
export function isInCallQueue(lead: Lead): boolean {
  const l = normalizeLead(lead);
  if (l.status === 'afgeboekt_geen_contact') return false;
  if (l.contact_uitkomst === 'deal' || l.contact_uitkomst === 'geen_interesse') return false;
  if (l.status === 'test_verzonden' || l.status === 'test_gestart' || l.status === 'test_afgerond') {
    return false;
  }
  if (l.contact_pogingen >= MAX_CONTACT_ATTEMPTS) return false;
  return l.status === 'nieuw' || l.status === 'contact_poging';
}

/** Nieuwste lead eerst (speed-to-lead). */
export function sortCallQueue(leads: Lead[]): Lead[] {
  return leads
    .filter(isInCallQueue)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getNextLeadInQueue(leads: Lead[], afterLeadId?: string): Lead | null {
  const queue = sortCallQueue(leads);
  if (queue.length === 0) return null;
  if (!afterLeadId) return queue[0];
  const idx = queue.findIndex((l) => l.id === afterLeadId);
  if (idx === -1) return queue[0];
  return queue[idx + 1] ?? queue[0];
}

export function countTodayCallAttempts(logs: CallLog[]): number {
  return logs.filter((l) => isToday(l.created_at)).length;
}

export interface CallOutcomeResult {
  leadUpdates: Partial<Lead>;
  callLog: Omit<CallLog, 'id' | 'created_at'>;
}

function incrementAttempt(
  lead: Lead,
  uitkomst: 'geen_gehoor' | 'voicemail',
  notitie: string | null
): CallOutcomeResult {
  const normalized = normalizeLead(lead);
  const now = new Date().toISOString();
  const nextAttempt = normalized.contact_pogingen + 1;

  if (nextAttempt >= MAX_CONTACT_ATTEMPTS) {
    return {
      leadUpdates: {
        contact_pogingen: MAX_CONTACT_ATTEMPTS,
        status: 'afgeboekt_geen_contact',
        laatste_belpoging: now,
      },
      callLog: {
        lead_id: lead.id,
        uitkomst,
        telt_mee: true,
        notitie,
      },
    };
  }

  return {
    leadUpdates: {
      contact_pogingen: nextAttempt,
      status: 'contact_poging',
      laatste_belpoging: now,
    },
    callLog: {
      lead_id: lead.id,
      uitkomst,
      telt_mee: true,
      notitie,
    },
  };
}

export function applyCallOutcome(
  lead: Lead,
  outcome: CallScreenOutcome,
  notitie: string | null
): CallOutcomeResult {
  const now = new Date().toISOString();

  switch (outcome) {
    case 'geen_gehoor':
      return incrementAttempt(lead, 'geen_gehoor', notitie);
    case 'voicemail':
      return incrementAttempt(lead, 'voicemail', notitie);
    case 'testlink_verstuurd':
      return {
        leadUpdates: {
          status: 'test_verzonden',
          laatste_belpoging: now,
        },
        callLog: {
          lead_id: lead.id,
          uitkomst: 'testlink_verstuurd',
          telt_mee: false,
          notitie,
        },
      };
    case 'bel_later_terug':
      return {
        leadUpdates: {
          laatste_belpoging: now,
        },
        callLog: {
          lead_id: lead.id,
          uitkomst: 'bel_later_terug',
          telt_mee: false,
          notitie,
        },
      };
  }
}

export function getHoortestLabel(lead: Lead): string {
  if (isTestComplete(lead)) return 'Hoortest afgerond';
  if (isTestStarted(lead)) return 'Hoortest gestart';
  return 'Hoortest nog niet gestart';
}

export function getLeadStatusLabelForCall(lead: Lead): string {
  return LEAD_STATUS_LABELS[normalizeLead(lead).status];
}
