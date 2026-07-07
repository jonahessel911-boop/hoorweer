import type { TestResult } from '../lib/types';
import {
  ANALYSIS_FREQS,
  buildHearingAnalysis,
  earPointsToDbLine,
  formatFreqLabel,
  type EarFreqPoint,
} from '../lib/hearingAnalysis';

interface OfferHearingAnalysisProps {
  results: TestResult[];
  leadName?: string;
}

const CHART_W = 520;
const CHART_H = 240;
const PAD = { top: 20, right: 20, bottom: 36, left: 44 };
const DB_MIN = 0;
const DB_MAX = 80;

function dbToY(db: number): number {
  const innerH = CHART_H - PAD.top - PAD.bottom;
  return PAD.top + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * innerH;
}

function freqToX(index: number): number {
  const innerW = CHART_W - PAD.left - PAD.right;
  const step = innerW / (ANALYSIS_FREQS.length - 1);
  return PAD.left + index * step;
}

function EarLine({
  label,
  points,
  labelY,
}: {
  label: string;
  points: EarFreqPoint[];
  labelY: number;
}) {
  const dbLine = earPointsToDbLine(points);
  const coords = dbLine
    .map((db, i) =>
      db === null ? null : { x: freqToX(i), y: dbToY(db), heard: points[i].heard }
    )
    .filter(Boolean) as { x: number; y: number; heard: boolean | null }[];

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <g>
      <text x={PAD.left} y={labelY} className="oha-ear-label">
        {label}
      </text>
      {coords.length > 1 && (
        <path d={linePath} fill="none" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
      )}
      {points.map((p, i) => {
        if (p.heard === null) return null;
        const x = freqToX(i);
        const y = dbToY(p.heard ? 18 : 58);
        const color = p.heard ? '#16a34a' : '#dc2626';
        return <circle key={`${label}-${p.freq}`} cx={x} cy={y} r="5" fill={color} stroke="#fff" strokeWidth="1.5" />;
      })}
    </g>
  );
}

export function OfferHearingAnalysis({ results }: OfferHearingAnalysisProps) {
  if (results.length === 0) {
    return (
      <div className="oha-empty">
        <p>Nog geen hoortestresultaten beschikbaar.</p>
      </div>
    );
  }

  const data = buildHearingAnalysis(results);

  return (
    <div className="oha-chart-wrap">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="oha-chart" role="img" aria-label="Audiogram">
        <rect x="0" y="0" width={CHART_W} height={CHART_H} fill="#fff" />

        {[0, 20, 40, 60, 80].map((db) => (
          <g key={db}>
            <line
              x1={PAD.left}
              y1={dbToY(db)}
              x2={CHART_W - PAD.right}
              y2={dbToY(db)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={dbToY(db) + 4} className="oha-axis-label" textAnchor="end">
              {db}
            </text>
          </g>
        ))}

        {ANALYSIS_FREQS.map((freq, i) => (
          <text key={freq} x={freqToX(i)} y={CHART_H - 10} className="oha-axis-label" textAnchor="middle">
            {formatFreqLabel(freq)}
          </text>
        ))}

        <EarLine label="Rechts" points={data.rechts} labelY={PAD.top - 4} />
        <EarLine label="Links" points={data.links} labelY={PAD.top + 12} />
      </svg>
    </div>
  );
}
