import type { Lead } from '../lib/types';
import { getLeadPipeline } from '../lib/leadStatus';

interface LeadStatusPipelineProps {
  lead: Lead;
}

export function LeadStatusPipeline({ lead }: LeadStatusPipelineProps) {
  const steps = getLeadPipeline(lead);

  return (
    <div className="status-pipeline">
      {steps.map((step, i) => (
        <div
          key={step.key}
          className={`pipeline-step pipeline-step-${step.state} ${i === 0 ? 'pipeline-step-first' : ''} ${i === steps.length - 1 ? 'pipeline-step-last' : ''}`}
        >
          <span className="pipeline-step-icon">
            {step.state === 'done' || step.state === 'current' ? '✓' : step.state === 'failed' ? '✕' : ''}
          </span>
          <span className="pipeline-step-label">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

export function getHearingTestLabel(lead: Lead): string {
  if (lead.status === 'test_afgerond') return 'Afgerond';
  if (lead.status === 'test_gestart') return 'Gestart';
  if (lead.status === 'test_verzonden') return 'Verzonden';
  return 'Niet gestart';
}
