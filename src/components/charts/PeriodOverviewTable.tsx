import { useMemo, useState } from 'react';
import { formatCurrency } from '../../lib/format';
import type { PeriodMetrics } from '../../lib/analytics';
import {
  formatRatio,
  type PeriodOverviewNode,
  type PeriodOverviewTotals,
} from '../../lib/periodOverview';

interface PeriodOverviewTableProps {
  months: PeriodOverviewNode[];
  totals: PeriodOverviewTotals;
}

function pct(value: number): string {
  return `${value}%`;
}

function MetricsCells({ m }: { m: PeriodMetrics }) {
  return (
    <>
      <td className="po-num">{formatCurrency(m.omzet)}</td>
      <td className="po-num">{m.orders}</td>
      <td className={`po-num ${m.nettoWinst >= 0 ? 'po-positive' : 'po-negative'}`}>
        {formatCurrency(m.nettoWinst)}
      </td>
      <td className="po-num">{m.leads}</td>
      <td className="po-num">{m.testsAfgerond}</td>
      <td className="po-num">{formatRatio(m.nettoSale, m.leads)}</td>
      <td className="po-num">{formatRatio(m.ondertekend, m.orders)}</td>
      <td className="po-num">{pct(m.conversieTestAfgerond)}</td>
      <td className="po-num">{m.nettoSale}</td>
    </>
  );
}

function PeriodRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: PeriodOverviewNode;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const rowClass = [
    'po-row',
    `po-row-${node.type}`,
    node.isCurrent ? 'po-row-current' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <tr className={rowClass}>
        <td className="po-period-cell" style={{ paddingLeft: 12 + depth * 20 }}>
          {hasChildren ? (
            <button type="button" className="po-expand" onClick={onToggle} aria-expanded={expanded}>
              <span className={`po-chevron ${expanded ? 'po-chevron-open' : ''}`}>▶</span>
            </button>
          ) : (
            <span className="po-expand-spacer" />
          )}
          <span className="po-period-label">{node.label}</span>
          {node.type === 'month' && node.isCurrent && (
            <span className="po-badge-huidig">HUIDIG</span>
          )}
        </td>
        <MetricsCells m={node.metrics} />
      </tr>
      {expanded &&
        node.children.map((child) => (
          <PeriodRowTree key={child.id} node={child} depth={depth + 1} />
        ))}
    </>
  );
}

function PeriodRowTree({ node, depth }: { node: PeriodOverviewNode; depth: number }) {
  const [expanded, setExpanded] = useState(node.isCurrent);
  return (
    <PeriodRow
      node={node}
      depth={depth}
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
    />
  );
}

function MonthRow({ node }: { node: PeriodOverviewNode }) {
  const [expanded, setExpanded] = useState(node.isCurrent);
  return (
    <PeriodRow
      node={node}
      depth={0}
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
    />
  );
}

export function PeriodOverviewTable({ months, totals }: PeriodOverviewTableProps) {
  const convLeadSale = useMemo(() => {
    if (totals.leads === 0) return 0;
    return Math.round((totals.nettoSale / totals.leads) * 1000) / 10;
  }, [totals]);

  return (
    <div className="period-overview">
      <p className="po-summary">
        Totaal: <strong>{formatCurrency(totals.omzet)}</strong> omzet ·{' '}
        <strong>{totals.leads}</strong> leads · <strong>{totals.orders}</strong> orders ·{' '}
        <strong>{formatCurrency(totals.winst)}</strong> winst ·{' '}
        <strong>{totals.nettoSale}</strong> netto sale ({convLeadSale}% conv.)
      </p>
      <p className="po-hint">Klik maand → week → dag voor detail per periode</p>

      <div className="po-table-wrap">
        <table className="po-table">
          <thead>
            <tr>
              <th className="po-th-period">Periode</th>
              <th>Omzet</th>
              <th>Orders</th>
              <th>Winst</th>
              <th>Leads</th>
              <th>Test afgerond</th>
              <th>Lead → sale</th>
              <th>Order → ondertekend</th>
              <th>Lead → test %</th>
              <th>Netto sale</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <MonthRow key={month.id} node={month} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
