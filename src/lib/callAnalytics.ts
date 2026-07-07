import type { CallLog, Lead } from './types';
import { isReachedUitkomst } from './callQueue';

function inRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export interface CallPeriodMetrics {
  belpogingen: number;
  bereikPercentage: number;
  geenContactMogelijk: number;
  calledLeads: number;
  reachedLeads: number;
}

export function computeCallMetrics(
  callLogs: CallLog[],
  leads: Lead[],
  start: Date,
  end: Date
): CallPeriodMetrics {
  const inRangeLogs = callLogs.filter((l) => inRange(l.created_at, start, end));
  const belpogingen = inRangeLogs.length;

  const calledLeadIds = new Set(inRangeLogs.map((l) => l.lead_id));
  const reachedLeadIds = new Set(
    inRangeLogs.filter((l) => isReachedUitkomst(l.uitkomst)).map((l) => l.lead_id)
  );

  const geenContactMogelijk = leads.filter(
    (l) =>
      l.status === 'afgeboekt_geen_contact' &&
      l.laatste_belpoging &&
      inRange(l.laatste_belpoging, start, end)
  ).length;

  return {
    belpogingen,
    bereikPercentage: pct(reachedLeadIds.size, calledLeadIds.size),
    geenContactMogelijk,
    calledLeads: calledLeadIds.size,
    reachedLeads: reachedLeadIds.size,
  };
}
