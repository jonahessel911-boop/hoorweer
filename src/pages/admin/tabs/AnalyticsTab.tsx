import { useState, useMemo } from 'react';
import { useRealtimeLeads } from '../../../hooks/useRealtimeLeads';
import { useRealtimeOrders } from '../../../hooks/useRealtimeOrders';
import { useRealtimeCallLogs } from '../../../hooks/useRealtimeCallLogs';
import {
  useAnalytics,
  getInkoopkosten,
  setInkoopkosten,
  PERIOD_OPTIONS,
  getPeriodRange,
  getPreviousPeriodRange,
  type PeriodKey,
} from '../../../lib/analytics';
import { computeCallMetrics } from '../../../lib/callAnalytics';
import { buildPeriodOverview, sumPeriodTotals } from '../../../lib/periodOverview';
import { formatCurrency } from '../../../lib/format';
import { TrendChart } from '../../../components/charts/TrendChart';
import { PeriodOverviewTable } from '../../../components/charts/PeriodOverviewTable';
import { FunnelChart } from '../../../components/charts/FunnelChart';
import { DualBarChart } from '../../../components/charts/DualBarChart';

export function AnalyticsTab() {
  const { leads, loading: leadsLoading } = useRealtimeLeads();
  const { orders, loading: ordersLoading } = useRealtimeOrders();
  const { callLogs, loading: logsLoading } = useRealtimeCallLogs();
  const [inkoop, setInkoop] = useState(getInkoopkosten());
  const [period, setPeriod] = useState<PeriodKey>('30d');

  const stats = useAnalytics(leads, orders, inkoop, period);
  const callStats = useMemo(() => {
    const range = getPeriodRange(period);
    return computeCallMetrics(callLogs, leads, range.start, range.end);
  }, [callLogs, leads, period]);
  const callStatsPrev = useMemo(() => {
    const range = getPreviousPeriodRange(period);
    return computeCallMetrics(callLogs, leads, range.start, range.end);
  }, [callLogs, leads, period]);
  const periodOverview = useMemo(
    () => buildPeriodOverview(leads, orders, inkoop, 6),
    [leads, orders, inkoop]
  );
  const periodTotals = useMemo(() => sumPeriodTotals(periodOverview), [periodOverview]);
  const loading = leadsLoading || ordersLoading || logsLoading;

  const handleInkoopChange = (value: string) => {
    const num = parseFloat(value) || 0;
    setInkoop(num);
    setInkoopkosten(num);
  };

  if (loading) {
    return <p>Laden...</p>;
  }

  return (
    <>
      <div className="tab-header">
        <h1 className="page-title">Analytics</h1>
        <div className="analytics-controls">
          <select
            className="form-input period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="inkoop-inline">
            <label htmlFor="inkoop">Inkoop/set €</label>
            <input
              id="inkoop"
              type="number"
              step="0.01"
              className="form-input"
              value={inkoop}
              onChange={(e) => handleInkoopChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="analytics-summary-bar card">
        <div className="summary-stat">
          <span className="summary-label">Netto omzet</span>
          <span className="summary-value kpi-positive">{formatCurrency(stats.current.nettoOmzet)}</span>
          <span className={`summary-change ${stats.current.nettoOmzet >= stats.previous.nettoOmzet ? 'change-up' : 'change-down'}`}>
            vs vorige periode: {formatCurrency(stats.previous.nettoOmzet)}
          </span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">Netto winst</span>
          <span className={`summary-value ${stats.current.nettoWinst >= 0 ? 'kpi-positive' : 'kpi-negative'}`}>
            {formatCurrency(stats.current.nettoWinst)}
          </span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">Netto sale</span>
          <span className="summary-value">{stats.current.nettoSale}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">Omzet (ondertekend)</span>
          <span className="summary-value">{formatCurrency(stats.current.omzet)}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">Ondertekend</span>
          <span className="summary-value">{stats.current.ondertekend}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">Leads</span>
          <span className="summary-value">{stats.current.leads}</span>
        </div>
      </div>

      <h2 className="section-title">Bellen</h2>
      <div className="analytics-call-grid">
        <div className="kpi-card card">
          <span className="kpi-label">Belpogingen</span>
          <span className="kpi-value">{callStats.belpogingen}</span>
          <span className="kpi-sub">vorige periode: {callStatsPrev.belpogingen}</span>
        </div>
        <div className="kpi-card card">
          <span className="kpi-label">Bereikpercentage</span>
          <span className="kpi-value">{callStats.bereikPercentage}%</span>
          <span className="kpi-sub">
            {callStats.reachedLeads} bereikt / {callStats.calledLeads} gebeld
          </span>
        </div>
        <div className="kpi-card card">
          <span className="kpi-label">Geen contact mogelijk</span>
          <span className="kpi-value">{callStats.geenContactMogelijk}</span>
          <span className="kpi-sub">vorige periode: {callStatsPrev.geenContactMogelijk}</span>
        </div>
      </div>

      <h2 className="section-title">Periode-overzicht</h2>
      <div className="card period-overview-card">
        <PeriodOverviewTable months={periodOverview} totals={periodTotals} />
      </div>

      <div className="charts-grid">
        <TrendChart buckets={stats.dailyBuckets} metric="leads" title="Leads per dag" />
        <TrendChart buckets={stats.dailyBuckets} metric="orders" title="Orders per dag" />
        <TrendChart buckets={stats.dailyBuckets} metric="omzet" title="Omzet per dag (ondertekend)" />
        <TrendChart buckets={stats.dailyBuckets} metric="nettoOmzet" title="Netto omzet per dag" />
      </div>

      <div className="charts-grid charts-grid-2">
        <DualBarChart
          title="Kerncijfers: huidige vs vorige periode"
          items={[
            { label: 'Leads', current: stats.current.leads, previous: stats.previous.leads },
            { label: 'Tests afgerond', current: stats.current.testsAfgerond, previous: stats.previous.testsAfgerond },
            { label: 'Orders', current: stats.current.orders, previous: stats.previous.orders },
            { label: 'Ondertekend', current: stats.current.ondertekend, previous: stats.previous.ondertekend },
            { label: 'Netto sale', current: stats.current.nettoSale, previous: stats.previous.nettoSale },
            { label: 'Netto omzet', current: stats.current.nettoOmzet, previous: stats.previous.nettoOmzet, format: 'currency' },
            { label: 'Netto winst', current: stats.current.nettoWinst, previous: stats.previous.nettoWinst, format: 'currency' },
          ]}
        />
        <FunnelChart steps={stats.funnel} />
      </div>
    </>
  );
}
