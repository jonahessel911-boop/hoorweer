import type { DailyBucket } from '../../lib/analytics';
import { formatCurrency } from '../../lib/format';

interface TrendChartProps {
  buckets: DailyBucket[];
  metric: 'leads' | 'orders' | 'omzet' | 'nettoOmzet';
  title: string;
}

const METRIC_COLORS = {
  leads: '#2563EB',
  orders: '#7C3AED',
  omzet: '#2563EB',
  nettoOmzet: '#16A34A',
};

export function TrendChart({ buckets, metric, title }: TrendChartProps) {
  const values = buckets.map((b) => b[metric]);
  const max = Math.max(...values, 1);

  if (buckets.length === 0) {
    return (
      <div className="chart-card card">
        <h3 className="chart-title">{title}</h3>
        <p className="chart-empty">Geen data in deze periode</p>
      </div>
    );
  }

  return (
    <div className="chart-card card">
      <h3 className="chart-title">{title}</h3>
      <div className="trend-chart">
        <div className="trend-chart-bars">
          {buckets.map((bucket) => {
            const value = bucket[metric];
            const height = (value / max) * 100;
            return (
              <div key={bucket.date} className="trend-bar-col" title={`${bucket.label}: ${metric === 'omzet' ? formatCurrency(value) : value}`}>
                <div className="trend-bar-value">
                  {metric === 'omzet' && value > 0
                    ? `€${Math.round(value)}`
                    : value > 0
                      ? value
                      : ''}
                </div>
                <div className="trend-bar-track">
                  <div
                    className="trend-bar-fill"
                    style={{ height: `${height}%`, background: METRIC_COLORS[metric] }}
                  />
                </div>
                <div className="trend-bar-label">{bucket.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
