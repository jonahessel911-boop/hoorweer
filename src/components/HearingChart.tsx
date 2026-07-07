import type { TestResult } from '../lib/types';

interface HearingChartProps {
  results: TestResult[];
}

function getResultForEar(
  results: TestResult[],
  freq: number,
  oor: 'links' | 'rechts'
): TestResult | undefined {
  return results.find(
    (r) =>
      r.frequentie === freq &&
      (r.oor === oor || r.oor === 'beide')
  );
}

export function HearingChart({ results }: HearingChartProps) {
  const toneResults = results.filter((r) => r.type === 'toon' && r.frequentie);
  const frequencies = [...new Set(toneResults.map((r) => r.frequentie!))].sort((a, b) => a - b);

  if (toneResults.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Nog geen toonresultaten.</p>;
  }

  const renderEar = (label: string, oor: 'links' | 'rechts') => (
    <div className="hearing-chart-ear">
      <div className="hearing-chart-ear-label">{label}</div>
      {frequencies.map((freq) => {
        const result = getResultForEar(toneResults, freq, oor);
        return (
          <div key={`${oor}-${freq}`} className="hearing-bar-row">
            <span className="hearing-bar-freq">{freq} Hz</span>
            <div
              className={`hearing-bar ${result ? result.antwoord : 'unknown'}`}
              title={result ? (result.antwoord === 'gehoord' ? 'Gehoord' : 'Niet gehoord') : 'Geen data'}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="hearing-chart">
      {renderEar('Links', 'links')}
      {renderEar('Rechts', 'rechts')}
    </div>
  );
}
