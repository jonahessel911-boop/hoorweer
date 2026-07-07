import { formatCurrency } from '../../lib/format';
import type { ComparisonRow } from '../../lib/analytics';

interface PeriodComparisonTableProps {
  rows: ComparisonRow[];
  currentLabel: string;
  previousLabel: string;
}

function formatValue(value: number, format: ComparisonRow['format']): string {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percent') return `${value}%`;
  return String(value);
}

export function PeriodComparisonTable({ rows, currentLabel, previousLabel }: PeriodComparisonTableProps) {
  return (
    <div className="card table-wrapper period-table">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>{currentLabel}</th>
            <th>{previousLabel}</th>
            <th>Wijziging</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="period-metric-name">{row.label}</td>
              <td className="period-value">{formatValue(row.current, row.format)}</td>
              <td className="period-value period-muted">{formatValue(row.previous, row.format)}</td>
              <td>
                <span className={`change-badge ${row.change >= 0 ? 'change-up' : 'change-down'}`}>
                  {row.change >= 0 ? '↑' : '↓'} {Math.abs(row.change)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
