import { TEST_STEPS, formatStepAnswer } from '../lib/testSteps';
import { buildHearingAnalysis } from './hearingAnalysis';
import type { Lead, Product, TestResult } from './types';

export interface HearingAiResult {
  bevindingen: string[];
  advies: string;
  details: string;
}

export function buildHearingAnalysisPrompt(
  lead: Lead,
  results: TestResult[],
  products: Product[]
): string {
  const analysis = buildHearingAnalysis(results);
  const resultsByStep = new Map(results.map((r) => [r.stap_nummer, r]));

  const stepLines = TEST_STEPS.map((step) => {
    const r = resultsByStep.get(step.stap);
    if (!r) return `- Stap ${step.stap}: ${step.label} → nog niet gedaan`;
    const answer = formatStepAnswer(step, r.antwoord).toUpperCase();
    return `- Stap ${step.stap}: ${step.label} → ${answer}`;
  }).join('\n');

  const catalog = products
    .filter((p) => p.actief)
    .map((p) => `- ${p.naam} (${p.model})`)
    .join('\n');

  return `Analyseer deze online hoortest.

Klant: ${lead.naam}
Score: ${analysis.scorePct}%
Profiel: ${analysis.profileLabel}

Resultaten:
${stepLines}

Producten: ${catalog || 'HearDirect Hoortoestel Set (HD-1)'}`;
}

export function parseHearingAiResponse(raw: string): HearingAiResult {
  const jsonMatch = raw.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Ongeldig AI-antwoord');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    bevindingen?: string[];
    advies?: string;
    details?: string;
    gesprek?: string;
    product_tekst?: string;
  };

  const bevindingen = (parsed.bevindingen || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const advies = parsed.advies?.trim() || parsed.gesprek?.trim() || '';

  if (bevindingen.length === 0 && !advies) {
    throw new Error('Ongeldig AI-antwoord');
  }

  return {
    bevindingen,
    advies,
    details: parsed.details?.trim() || '',
  };
}

export async function fetchHearingAiAnalysis(prompt: string): Promise<HearingAiResult> {
  const response = await fetch('/api/hearing-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = (await response.json()) as { analysis?: string; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Analyse mislukt');
  }

  if (!data.analysis) {
    throw new Error('Geen analyse ontvangen');
  }

  return parseHearingAiResponse(data.analysis);
}
