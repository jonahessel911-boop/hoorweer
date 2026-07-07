import type { Lead, Order } from './types';
import { computePeriodMetrics, type PeriodMetrics } from './analytics';

export type PeriodNodeType = 'month' | 'week' | 'day';

export interface PeriodOverviewNode {
  id: string;
  type: PeriodNodeType;
  label: string;
  start: Date;
  end: Date;
  metrics: PeriodMetrics;
  isCurrent: boolean;
  children: PeriodOverviewNode[];
}

export interface PeriodOverviewTotals {
  omzet: number;
  orders: number;
  winst: number;
  leads: number;
  nettoSale: number;
  ondertekend: number;
}

const DAY_LABELS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function formatMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeeksInMonth(monthStart: Date): { start: Date; end: Date; weekNum: number }[] {
  const monthEnd = endOfMonth(monthStart);
  const weeks: { start: Date; end: Date; weekNum: number }[] = [];
  const seen = new Set<string>();

  let cursor = startOfWeekMonday(monthStart);
  while (cursor <= monthEnd) {
    const weekStart = startOfDay(cursor);
    const weekEnd = endOfWeekSunday(cursor);
    const key = weekStart.toISOString().slice(0, 10);
    if (!seen.has(key) && weekEnd >= monthStart && weekStart <= monthEnd) {
      seen.add(key);
      weeks.push({ start: weekStart, end: weekEnd, weekNum: getISOWeek(weekStart) });
    }
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

function getDaysInWeek(weekStart: Date, weekEnd: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(weekStart);
  const end = startOfDay(weekEnd);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function buildDayNode(
  day: Date,
  leads: Lead[],
  orders: Order[],
  inkoop: number,
  today: Date
): PeriodOverviewNode {
  const start = startOfDay(day);
  const end = endOfDay(day);
  const dayLabel = DAY_LABELS[day.getDay()];
  return {
    id: `day-${start.toISOString().slice(0, 10)}`,
    type: 'day',
    label: `${dayLabel} ${formatShort(day)}`,
    start,
    end,
    metrics: computePeriodMetrics(leads, orders, start, end, inkoop),
    isCurrent: isSameDay(day, today),
    children: [],
  };
}

function buildWeekNode(
  week: { start: Date; end: Date; weekNum: number },
  leads: Lead[],
  orders: Order[],
  inkoop: number,
  today: Date
): PeriodOverviewNode {
  const children = getDaysInWeek(week.start, week.end).map((d) =>
    buildDayNode(d, leads, orders, inkoop, today)
  );
  return {
    id: `week-${week.start.toISOString().slice(0, 10)}`,
    type: 'week',
    label: `W${week.weekNum} – ${formatShort(week.start)} – ${formatShort(week.end)}`,
    start: week.start,
    end: week.end,
    metrics: computePeriodMetrics(leads, orders, week.start, week.end, inkoop),
    isCurrent: today >= week.start && today <= week.end,
    children,
  };
}

function buildMonthNode(
  monthStart: Date,
  leads: Lead[],
  orders: Order[],
  inkoop: number,
  today: Date
): PeriodOverviewNode {
  const start = startOfMonth(monthStart);
  const end = endOfMonth(monthStart);
  const weeks = getWeeksInMonth(start);
  const children = weeks.map((w) => buildWeekNode(w, leads, orders, inkoop, today));

  return {
    id: `month-${formatMonthKey(start)}`,
    type: 'month',
    label: formatMonthKey(start),
    start,
    end,
    metrics: computePeriodMetrics(leads, orders, start, end, inkoop),
    isCurrent: isSameMonth(start, today),
    children,
  };
}

export function buildPeriodOverview(
  leads: Lead[],
  orders: Order[],
  inkoopkosten: number,
  monthCount = 6
): PeriodOverviewNode[] {
  const today = startOfDay(new Date());
  const months: PeriodOverviewNode[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(buildMonthNode(d, leads, orders, inkoopkosten, today));
  }

  return months;
}

export function sumPeriodTotals(nodes: PeriodOverviewNode[]): PeriodOverviewTotals {
  return nodes.reduce(
    (acc, node) => ({
      omzet: acc.omzet + node.metrics.omzet,
      orders: acc.orders + node.metrics.orders,
      winst: acc.winst + node.metrics.nettoWinst,
      leads: acc.leads + node.metrics.leads,
      nettoSale: acc.nettoSale + node.metrics.nettoSale,
      ondertekend: acc.ondertekend + node.metrics.ondertekend,
    }),
    { omzet: 0, orders: 0, winst: 0, leads: 0, nettoSale: 0, ondertekend: 0 }
  );
}

export function formatRatio(numerator: number, denominator: number): string {
  if (denominator === 0) return `${numerator}/0 (0%)`;
  const pct = Math.round((numerator / denominator) * 1000) / 10;
  return `${numerator}/${denominator} (${pct}%)`;
}
