import type { TestStep } from './types';

/** Dagelijkse gehoorvragen (stap 1–6) */
export const INTAKE_QUESTIONS: TestStep[] = [
  {
    stap: 1,
    type: 'vraag',
    label: 'Heeft u wel eens last dat u iemand niet kunt verstaan tijdens het bellen?',
  },
  {
    stap: 2,
    type: 'vraag',
    label: 'Moet u de televisie of radio harder zetten dan anderen in huis?',
  },
  {
    stap: 3,
    type: 'vraag',
    label: 'Heeft u moeite om gesprekken te volgen in een drukke omgeving (bijv. restaurant)?',
  },
  {
    stap: 4,
    type: 'vraag',
    label: 'Moet u mensen vaak vragen om iets te herhalen?',
  },
  {
    stap: 5,
    type: 'vraag',
    label: 'Heeft u moeite met hoge tonen, zoals kinderstemmen of vogels?',
  },
  {
    stap: 6,
    type: 'vraag',
    label: 'Vindt u dat anderen onduidelijk of zacht praten?',
  },
];

/**
 * 10 toonstappen — 5 frequenties × 2 oren (StereoPanner: pan −1 = links, +1 = rechts).
 * Start met 1000 Hz (makkelijkst hoorbaar).
 */
export const TONE_TEST_STEPS: TestStep[] = [
  { stap: 7, type: 'toon', frequentie: 1000, oor: 'links', label: 'Toon 1000 Hz — links' },
  { stap: 8, type: 'toon', frequentie: 1000, oor: 'rechts', label: 'Toon 1000 Hz — rechts' },
  { stap: 9, type: 'toon', frequentie: 2000, oor: 'links', label: 'Toon 2000 Hz — links' },
  { stap: 10, type: 'toon', frequentie: 2000, oor: 'rechts', label: 'Toon 2000 Hz — rechts' },
  { stap: 11, type: 'toon', frequentie: 4000, oor: 'links', label: 'Toon 4000 Hz — links' },
  { stap: 12, type: 'toon', frequentie: 4000, oor: 'rechts', label: 'Toon 4000 Hz — rechts' },
  { stap: 13, type: 'toon', frequentie: 6000, oor: 'links', label: 'Toon 6000 Hz — links' },
  { stap: 14, type: 'toon', frequentie: 6000, oor: 'rechts', label: 'Toon 6000 Hz — rechts' },
  { stap: 15, type: 'toon', frequentie: 500, oor: 'links', label: 'Toon 500 Hz — links' },
  { stap: 16, type: 'toon', frequentie: 500, oor: 'rechts', label: 'Toon 500 Hz — rechts' },
];

/** @deprecated Gebruik TONE_TEST_STEPS */
export const AUDIO_TEST_STEPS = TONE_TEST_STEPS;

export const TONE_STEP_COUNT = TONE_TEST_STEPS.length;

export const TEST_STEPS: TestStep[] = [...INTAKE_QUESTIONS, ...TONE_TEST_STEPS];
export const TOTAL_STEPS = TEST_STEPS.length;
export const INTAKE_STEP_COUNT = INTAKE_QUESTIONS.length;

export function formatStepAnswer(step: TestStep, antwoord: 'gehoord' | 'niet_gehoord'): string {
  if (step.type === 'vraag') {
    return antwoord === 'gehoord' ? 'Ja' : 'Nee';
  }
  return antwoord === 'gehoord' ? 'Gehoord' : 'Niet gehoord';
}

export function stepProgressLabel(stepIndex: number): string {
  const step = TEST_STEPS[stepIndex];
  if (step.type === 'vraag') {
    const intakeIdx = INTAKE_QUESTIONS.findIndex((s) => s.stap === step.stap) + 1;
    return `Vraag ${intakeIdx} van ${INTAKE_STEP_COUNT}`;
  }
  const toneIdx = TONE_TEST_STEPS.findIndex((s) => s.stap === step.stap) + 1;
  return `Toontest ${toneIdx} van ${TONE_STEP_COUNT}`;
}
