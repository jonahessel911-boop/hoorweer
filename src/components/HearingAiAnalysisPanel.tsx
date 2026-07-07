import { useState } from 'react';
import {
  buildHearingAnalysisPrompt,
  fetchHearingAiAnalysis,
  type HearingAiResult,
} from '../lib/hearingAiAnalysis';
import { fetchProducts } from '../lib/db';
import type { Lead, TestResult } from '../lib/types';

interface HearingAiAnalysisPanelProps {
  lead: Lead;
  testResults: TestResult[];
}

export function HearingAiAnalysisPanel({ lead, testResults }: HearingAiAnalysisPanelProps) {
  const [result, setResult] = useState<HearingAiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const canAnalyze = testResults.length > 0;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setError(null);
    setExpanded(false);
    try {
      const { data: products } = await fetchProducts();
      const prompt = buildHearingAnalysisPrompt(lead, testResults, products || []);
      const analysis = await fetchHearingAiAnalysis(prompt);
      setResult(analysis);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Analyse mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hearing-ai-panel">
      <div className="hearing-ai-header">
        <button
          type="button"
          className="btn btn-primary hearing-ai-btn"
          onClick={handleAnalyze}
          disabled={!canAnalyze || loading}
        >
          <span className="hearing-ai-icon" aria-hidden>🧠</span>
          {loading ? 'Analyseren...' : 'Analyseer test'}
        </button>
        {!canAnalyze && (
          <span className="crm-muted hearing-ai-hint">Minimaal 1 teststap nodig</span>
        )}
      </div>

      {error && <p className="hearing-ai-error">{error}</p>}

      {result && (
        <div className="hearing-ai-ecard">
          {result.bevindingen.length > 0 && (
            <div className="hearing-ai-ecard-section">
              <p className="hearing-ai-ecard-label">Bevindingen</p>
              <ul className="hearing-ai-keypoints">
                {result.bevindingen.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {result.advies && (
            <div className="hearing-ai-ecard-section">
              <p className="hearing-ai-ecard-label">Advies</p>
              <p className="hearing-ai-advies">{result.advies}</p>
            </div>
          )}

          {result.details && (
            <div className="hearing-ai-expand">
              <button
                type="button"
                className="hearing-ai-see-more"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? 'Minder lezen' : 'Meer lezen'}
                <span className="hearing-ai-see-more-icon" aria-hidden>
                  {expanded ? '▲' : '▼'}
                </span>
              </button>
              {expanded && (
                <p className="hearing-ai-details">{result.details}</p>
              )}
            </div>
          )}

          <p className="hearing-ai-disclaimer">Online screening — geen medische diagnose.</p>
        </div>
      )}
    </div>
  );
}
