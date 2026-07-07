import { useMemo } from 'react';
import type { Lead, TestResult } from '../lib/types';
import { buildHearingAnalysis, formatFreqLabel } from '../lib/hearingAnalysis';
import { TOTAL_STEPS } from '../lib/testSteps';
import { isTestComplete, isTestStarted } from '../lib/leadStatus';

interface BellenHearingCardProps {
  lead: Lead;
  testResults: TestResult[];
  loading?: boolean;
}

function FreqCell({ heard, freq }: { heard: boolean | null; freq: number }) {
  if (heard === null) {
    return (
      <span className="bellen-freq-cell bellen-freq-pending" title={`${freq} Hz — niet getest`}>
        {formatFreqLabel(freq)}
      </span>
    );
  }
  return (
    <span
      className={`bellen-freq-cell ${heard ? 'bellen-freq-yes' : 'bellen-freq-no'}`}
      title={`${freq} Hz — ${heard ? 'gehoord' : 'niet gehoord'}`}
    >
      {formatFreqLabel(freq)}
    </span>
  );
}

export function BellenHearingCard({ lead, testResults, loading }: BellenHearingCardProps) {
  const analysis = useMemo(() => buildHearingAnalysis(testResults), [testResults]);
  const completedCount = testResults.length;
  const isComplete = isTestComplete(lead) || completedCount >= TOTAL_STEPS;
  const isStarted = isTestStarted(lead) || completedCount > 0;

  if (loading) {
    return (
      <div className="bellen-side-card card">
        <h3 className="bellen-side-title">Hoortest</h3>
        <p className="crm-muted" style={{ margin: 0 }}>Laden…</p>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="bellen-side-card card">
        <h3 className="bellen-side-title">Hoortest</h3>
        <p className="bellen-hearing-empty">Nog niet gestart</p>
      </div>
    );
  }

  return (
    <div className="bellen-side-card card">
      <div className="bellen-side-card-head">
        <h3 className="bellen-side-title">Hoortest</h3>
        <span className={`bellen-hearing-status ${isComplete ? 'bellen-hearing-done' : 'bellen-hearing-progress'}`}>
          {isComplete ? 'Afgerond' : 'Bezig'}
        </span>
      </div>

      <div className="bellen-hearing-score">
        <span className="bellen-hearing-score-value">{analysis.scorePct}%</span>
        <span className="bellen-hearing-score-label">score</span>
      </div>

      <p className="bellen-hearing-profile">{analysis.profileLabel}</p>
      <p className="bellen-hearing-detail">{analysis.profileDetail}</p>

      <div className="bellen-ear-grid">
        <div className="bellen-ear-col">
          <span className="bellen-ear-label">Links</span>
          <div className="bellen-freq-row">
            {analysis.links.map((p) => (
              <FreqCell key={`l-${p.freq}`} freq={p.freq} heard={p.heard} />
            ))}
          </div>
        </div>
        <div className="bellen-ear-col">
          <span className="bellen-ear-label">Rechts</span>
          <div className="bellen-freq-row">
            {analysis.rechts.map((p) => (
              <FreqCell key={`r-${p.freq}`} freq={p.freq} heard={p.heard} />
            ))}
          </div>
        </div>
      </div>

      {analysis.speechTotal > 0 && (
        <div className="bellen-speech-row">
          <span className="bellen-ear-label">Spraak</span>
          <span className="bellen-speech-value">
            {analysis.speechHeard}/{analysis.speechTotal} gehoord
          </span>
        </div>
      )}

      <p className="bellen-hearing-progress-text">
        {completedCount} / {TOTAL_STEPS} stappen
      </p>
    </div>
  );
}
