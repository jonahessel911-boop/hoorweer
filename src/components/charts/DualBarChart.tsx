import { formatCurrency } from '../../lib/format';

interface DualBarChartProps {
  title: string;
  items: { label: string; current: number; previous: number; format?: 'currency' | 'number' }[];
}

export function DualBarChart({ title, items }: DualBarChartProps) {
  const max = Math.max(...items.flatMap((i) => [i.current, i.previous]), 1);

  const fmt = (v: number, format?: 'currency' | 'number') =>
    format === 'currency' ? formatCurrency(v) : String(v);

  return (
    <div className="chart-card card">
      <h3 className="chart-title">{title}</h3>
      <div className="dual-bar-legend">
        <span><span className="legend-dot legend-current" /> Huidige periode</span>
        <span><span className="legend-dot legend-previous" /> Vorige periode</span>
      </div>
      <div className="dual-bar-chart">
        {items.map((item) => (
          <div key={item.label} className="dual-bar-group">
            <div className="dual-bar-label">{item.label}</div>
            <div className="dual-bar-pair">
              <div className="dual-bar-row">
                <div
                  className="dual-bar dual-bar-current"
                  style={{ width: `${(item.current / max) * 100}%` }}
                />
                <span className="dual-bar-num">{fmt(item.current, item.format)}</span>
              </div>
              <div className="dual-bar-row">
                <div
                  className="dual-bar dual-bar-previous"
                  style={{ width: `${(item.previous / max) * 100}%` }}
                />
                <span className="dual-bar-num dual-bar-num-muted">{fmt(item.previous, item.format)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
