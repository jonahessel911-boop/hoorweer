import { TEST_STEPS, TOTAL_STEPS, formatStepAnswer } from '../lib/testSteps';
import type { TestResult } from '../lib/types';
import { HearingChart } from './HearingChart';

interface HearingTestStepsTableProps {
  testResults: TestResult[];
  leadStatus: string;
}

function StepDoneCheck({ done, current }: { done: boolean; current: boolean }) {
  if (done) {
    return <span className="step-check step-check-done" title="Stap voltooid">✓</span>;
  }
  if (current) {
    return <span className="step-check step-check-current" title="Huidige stap">●</span>;
  }
  return <span className="step-check step-check-pending" title="Nog niet gedaan">—</span>;
}

export function HearingTestStepsTable({ testResults, leadStatus }: HearingTestStepsTableProps) {
  const resultsByStep = new Map(testResults.map((r) => [r.stap_nummer, r]));
  const completedCount = testResults.length;
  const firstIncomplete = TEST_STEPS.find((s) => !resultsByStep.has(s.stap))?.stap ?? null;
  const isComplete = leadStatus === 'test_afgerond' || completedCount >= TOTAL_STEPS;
  const isStarted = leadStatus === 'test_gestart' || isComplete || completedCount > 0;

  const completionPct = Math.round((completedCount / TOTAL_STEPS) * 100);

  return (
    <div className="hearing-test-section">
      <div className="hearing-test-summary">
        <div className="hearing-summary-stat">
          <span className="hearing-summary-label">Status</span>
          <span className={`hearing-summary-value ${isComplete ? 'text-success' : isStarted ? 'text-warning' : ''}`}>
            {isComplete ? 'Afgerond' : isStarted ? 'Bezig' : 'Niet gestart'}
          </span>
        </div>
        <div className="hearing-summary-stat">
          <span className="hearing-summary-label">Voortgang</span>
          <span className="hearing-summary-value">{completedCount} / {TOTAL_STEPS} stappen</span>
        </div>
        <div className="hearing-summary-stat">
          <span className="hearing-summary-label">Voltooiing</span>
          <span className="hearing-summary-value">{completionPct}%</span>
        </div>
        {!isComplete && firstIncomplete && isStarted && (
          <div className="hearing-summary-stat">
            <span className="hearing-summary-label">Huidige stap</span>
            <span className="hearing-summary-value">{firstIncomplete}</span>
          </div>
        )}
      </div>

      <div className="step-progress-bar">
        <div className="step-progress-fill" style={{ width: `${completionPct}%` }} />
      </div>

      <div className="crm-panel" style={{ marginTop: 16 }}>
        <div className="crm-table-wrap">
          <table className="crm-table hearing-steps-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 56 }}>Gedaan</th>
                <th>Stap</th>
                <th style={{ width: 140 }}>Antwoord</th>
              </tr>
            </thead>
            <tbody>
              {TEST_STEPS.map((step) => {
                const result = resultsByStep.get(step.stap);
                const done = Boolean(result);
                const isCurrent = isStarted && !done && firstIncomplete === step.stap;

                return (
                  <tr key={step.stap} className={isCurrent ? 'hearing-step-current' : ''}>
                    <td className="crm-muted">{step.stap}</td>
                    <td>
                      <StepDoneCheck done={done} current={isCurrent} />
                    </td>
                    <td>{step.label}</td>
                    <td>
                      {result ? (
                        <span className={result.antwoord === 'gehoord' ? 'answer-yes' : 'answer-no'}>
                          {formatStepAnswer(step, result.antwoord)}
                        </span>
                      ) : (
                        <span className="crm-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="crm-panel" style={{ marginTop: 16, padding: 20 }}>
          <h3 className="crm-section-title" style={{ marginTop: 0 }}>Audiogram</h3>
          <HearingChart results={testResults} />
        </div>
      )}
    </div>
  );
}
