import { useMemo } from 'react';
import type { Lead, Order, OrderStatus } from './types';
import { isNettoSaleOrder } from './orderTimeline';
import { isTestComplete, isTestStarted } from './leadStatus';

const INKOOP_KEY = 'hear-direct-inkoopkosten';

export type PeriodKey = '7d' | '30d' | '90d' | 'month';

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d', label: 'Laatste 7 dagen', days: 7 },
  { key: '30d', label: 'Laatste 30 dagen', days: 30 },
  { key: '90d', label: 'Laatste 90 dagen', days: 90 },
  { key: 'month', label: 'Deze maand', days: 0 },
];

export function getInkoopkosten(): number {
  const stored = localStorage.getItem(INKOOP_KEY);
  return stored ? parseFloat(stored) : 62;
}

export function setInkoopkosten(value: number): void {
  localStorage.setItem(INKOOP_KEY, String(value));
}

/** Orders die meetellen voor omzet: vanaf ondertekening */
export function isRevenueOrder(status: OrderStatus): boolean {
  return status === 'ondertekend' || status === 'betaallink_verzonden' || status === 'betaald';
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

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

export function getPeriodRange(key: PeriodKey): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  const start = startOfDay(new Date());

  if (key === 'month') {
    start.setDate(1);
    return { start, end };
  }

  const option = PERIOD_OPTIONS.find((p) => p.key === key)!;
  start.setDate(start.getDate() - (option.days - 1));
  return { start, end };
}

export function getPreviousPeriodRange(key: PeriodKey): { start: Date; end: Date } {
  const current = getPeriodRange(key);
  const durationMs = current.end.getTime() - current.start.getTime();
  const end = new Date(current.start.getTime() - 1);
  const start = new Date(end.getTime() - durationMs);
  return { start: startOfDay(start), end: endOfDay(end) };
}

function inRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function orderRevenueDate(order: Order): string | null {
  if (!isRevenueOrder(order.status)) return null;
  return order.ondertekend_op || order.created_at;
}

function orderNettoSaleDate(order: Order): string | null {
  if (!isNettoSaleOrder(order)) return null;
  return order.netto_sale_op || null;
}

export interface PeriodMetrics {
  leads: number;
  testsGestart: number;
  testsAfgerond: number;
  orders: number;
  ondertekend: number;
  omzet: number;
  winst: number;
  nettoSale: number;
  nettoOmzet: number;
  nettoWinst: number;
  conversieTestGestart: number;
  conversieTestAfgerond: number;
  conversieLeadToOrder: number;
  conversieOndertekend: number;
  conversieNettoSale: number;
}

export function computePeriodMetrics(
  leads: Lead[],
  orders: Order[],
  start: Date,
  end: Date,
  inkoopkosten: number
): PeriodMetrics {
  return computeMetrics(leads, orders, start, end, inkoopkosten);
}

function computeMetrics(
  leads: Lead[],
  orders: Order[],
  start: Date,
  end: Date,
  inkoopkosten: number
): PeriodMetrics {
  const periodLeads = leads.filter((l) => inRange(l.created_at, start, end));
  const periodOrders = orders.filter((o) => inRange(o.created_at, start, end));

  const testsGestart = periodLeads.filter((l) => isTestStarted(l)).length;
  const testsAfgerond = periodLeads.filter((l) => isTestComplete(l)).length;

  const revenueOrders = orders.filter((o) => {
    const date = orderRevenueDate(o);
    return date && inRange(date, start, end);
  });

  const omzet = revenueOrders.reduce((sum, o) => sum + Number(o.prijs), 0);
  const winst = omzet - revenueOrders.length * inkoopkosten;

  const nettoOrders = orders.filter((o) => {
    const date = orderNettoSaleDate(o);
    return date && inRange(date, start, end);
  });
  const nettoOmzet = nettoOrders.reduce((sum, o) => sum + Number(o.prijs), 0);
  const nettoWinst = nettoOmzet - nettoOrders.length * inkoopkosten;

  const leadIdsWithOrder = new Set(periodOrders.map((o) => o.lead_id));

  return {
    leads: periodLeads.length,
    testsGestart,
    testsAfgerond,
    orders: periodOrders.length,
    ondertekend: revenueOrders.length,
    omzet,
    winst,
    nettoSale: nettoOrders.length,
    nettoOmzet,
    nettoWinst,
    conversieTestGestart: pct(testsGestart, periodLeads.length),
    conversieTestAfgerond: pct(testsAfgerond, periodLeads.length),
    conversieLeadToOrder: pct(leadIdsWithOrder.size, periodLeads.length),
    conversieOndertekend: pct(revenueOrders.length, periodOrders.length),
    conversieNettoSale: pct(nettoOrders.length, periodOrders.length),
  };
}

export interface DailyBucket {
  label: string;
  date: string;
  leads: number;
  orders: number;
  omzet: number;
  nettoOmzet: number;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export function getDailyBuckets(
  leads: Lead[],
  orders: Order[],
  start: Date,
  end: Date
): DailyBucket[] {
  const buckets: DailyBucket[] = [];
  const cursor = startOfDay(new Date(start));

  while (cursor <= end) {
    const dayStart = startOfDay(new Date(cursor));
    const dayEnd = endOfDay(new Date(cursor));
    const dateKey = dayStart.toISOString().slice(0, 10);

    buckets.push({
      label: formatDayLabel(dayStart),
      date: dateKey,
      leads: leads.filter((l) => inRange(l.created_at, dayStart, dayEnd)).length,
      orders: orders.filter((o) => inRange(o.created_at, dayStart, dayEnd)).length,
      omzet: orders
        .filter((o) => {
          const rd = orderRevenueDate(o);
          return rd && inRange(rd, dayStart, dayEnd);
        })
        .reduce((sum, o) => sum + Number(o.prijs), 0),
      nettoOmzet: orders
        .filter((o) => {
          const nd = orderNettoSaleDate(o);
          return nd && inRange(nd, dayStart, dayEnd);
        })
        .reduce((sum, o) => sum + Number(o.prijs), 0),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export interface ComparisonRow {
  label: string;
  current: number;
  previous: number;
  change: number;
  format: 'number' | 'currency' | 'percent';
}

export interface AnalyticsData {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  currentRange: { start: Date; end: Date };
  previousRange: { start: Date; end: Date };
  currentRangeLabel: string;
  previousRangeLabel: string;
  dailyBuckets: DailyBucket[];
  comparisonRows: ComparisonRow[];
  funnel: { label: string; count: number; pct: number }[];
}

export function useAnalytics(
  leads: Lead[],
  orders: Order[],
  inkoopkosten: number,
  periodKey: PeriodKey
): AnalyticsData {
  return useMemo(() => {
    const currentRange = getPeriodRange(periodKey);
    const previousRange = getPreviousPeriodRange(periodKey);

    const current = computeMetrics(
      leads,
      orders,
      currentRange.start,
      currentRange.end,
      inkoopkosten
    );
    const previous = computeMetrics(
      leads,
      orders,
      previousRange.start,
      previousRange.end,
      inkoopkosten
    );

    const dailyBuckets = getDailyBuckets(
      leads,
      orders,
      currentRange.start,
      currentRange.end
    );

    const comparisonRows: ComparisonRow[] = [
      { label: 'Leads', current: current.leads, previous: previous.leads, change: pctChange(current.leads, previous.leads), format: 'number' },
      { label: 'Hoortest gestart', current: current.testsGestart, previous: previous.testsGestart, change: pctChange(current.testsGestart, previous.testsGestart), format: 'number' },
      { label: 'Hoortest afgerond', current: current.testsAfgerond, previous: previous.testsAfgerond, change: pctChange(current.testsAfgerond, previous.testsAfgerond), format: 'number' },
      { label: 'Orders aangemaakt', current: current.orders, previous: previous.orders, change: pctChange(current.orders, previous.orders), format: 'number' },
      { label: 'Ondertekend (omzet)', current: current.ondertekend, previous: previous.ondertekend, change: pctChange(current.ondertekend, previous.ondertekend), format: 'number' },
      { label: 'Netto sale', current: current.nettoSale, previous: previous.nettoSale, change: pctChange(current.nettoSale, previous.nettoSale), format: 'number' },
      { label: 'Omzet (ondertekend)', current: current.omzet, previous: previous.omzet, change: pctChange(current.omzet, previous.omzet), format: 'currency' },
      { label: 'Netto omzet', current: current.nettoOmzet, previous: previous.nettoOmzet, change: pctChange(current.nettoOmzet, previous.nettoOmzet), format: 'currency' },
      { label: 'Netto winst', current: current.nettoWinst, previous: previous.nettoWinst, change: pctChange(current.nettoWinst, previous.nettoWinst), format: 'currency' },
      { label: 'Winst (ondertekend)', current: current.winst, previous: previous.winst, change: pctChange(current.winst, previous.winst), format: 'currency' },
      { label: 'Conv. lead → test', current: current.conversieTestGestart, previous: previous.conversieTestGestart, change: pctChange(current.conversieTestGestart, previous.conversieTestGestart), format: 'percent' },
      { label: 'Conv. lead → order', current: current.conversieLeadToOrder, previous: previous.conversieLeadToOrder, change: pctChange(current.conversieLeadToOrder, previous.conversieLeadToOrder), format: 'percent' },
      { label: 'Conv. order → ondertekend', current: current.conversieOndertekend, previous: previous.conversieOndertekend, change: pctChange(current.conversieOndertekend, previous.conversieOndertekend), format: 'percent' },
      { label: 'Conv. order → netto sale', current: current.conversieNettoSale, previous: previous.conversieNettoSale, change: pctChange(current.conversieNettoSale, previous.conversieNettoSale), format: 'percent' },
    ];

    const funnel = [
      { label: 'Leads', count: current.leads, pct: 100 },
      { label: 'Test gestart', count: current.testsGestart, pct: pct(current.testsGestart, current.leads) },
      { label: 'Test afgerond', count: current.testsAfgerond, pct: pct(current.testsAfgerond, current.leads) },
      { label: 'Orders', count: current.orders, pct: pct(current.orders, current.leads) },
      { label: 'Ondertekend', count: current.ondertekend, pct: pct(current.ondertekend, current.leads) },
      { label: 'Netto sale', count: current.nettoSale, pct: pct(current.nettoSale, current.leads) },
    ].map((step) => ({ ...step, pct: step.pct }));

    return {
      current,
      previous,
      currentRange,
      previousRange,
      currentRangeLabel: formatRangeLabel(currentRange.start, currentRange.end),
      previousRangeLabel: formatRangeLabel(previousRange.start, previousRange.end),
      dailyBuckets,
      comparisonRows,
      funnel,
    };
  }, [leads, orders, inkoopkosten, periodKey]);
}

export function formatRangeLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('nl-NL', opts)} – ${end.toLocaleDateString('nl-NL', opts)}`;
}
