import type { TestResult } from '../lib/types';
import { TEST_STEPS, formatStepAnswer } from '../lib/testSteps';

interface OfferHearingResultsProps {
  results: TestResult[];
}

function oorLabel(oor: string | null | undefined): string {
  if (oor === 'links') return 'Links';
  if (oor === 'rechts') return 'Rechts';
  if (oor === 'beide') return 'Beide oren';
  return '—';
}

export function OfferHearingResults({ results }: OfferHearingResultsProps) {
  const resultsByStep = new Map(results.map((r) => [r.stap_nummer, r]));

  if (results.length === 0) {
    return (
      <p className="contract-hearing-empty">
        Er zijn nog geen hoortestresultaten beschikbaar voor deze offerte.
      </p>
    );
  }

  return (
    <div className="offer-hearing-grid">
      {TEST_STEPS.map((step) => {
        const result = resultsByStep.get(step.stap);
        const freqLabel =
          step.type === 'vraag'
            ? 'Vraag'
            : step.type === 'toon'
              ? `${step.frequentie} Hz`
              : 'Spraak';

        if (!result) {
          return (
            <div key={step.stap} className="hearing-result-box hearing-result-pending">
              <span className="hearing-result-freq">{freqLabel}</span>
              <span className="hearing-result-ear">{step.type === 'toon' ? oorLabel(step.oor) : '—'}</span>
              <span className="hearing-result-status">Niet voltooid</span>
            </div>
          );
        }

        const heard = result.antwoord === 'gehoord';
        const statusLabel = formatStepAnswer(step, result.antwoord);
        return (
          <div
            key={step.stap}
            className={`hearing-result-box ${heard ? 'hearing-result-yes' : 'hearing-result-no'}`}
          >
            <span className="hearing-result-freq">{freqLabel}</span>
            <span className="hearing-result-ear">{step.type === 'toon' ? oorLabel(result.oor) : '—'}</span>
            <span className="hearing-result-status">
              {step.type === 'vraag' ? statusLabel : heard ? '✓ Gehoord' : '✕ Niet gehoord'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
