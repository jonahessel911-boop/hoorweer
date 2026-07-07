import type { TestResult } from '../lib/types';

export const ANALYSIS_FREQS = [500, 1000, 2000, 4000, 6000] as const;

export interface EarFreqPoint {
  freq: number;
  heard: boolean | null;
}

export interface HearingAnalysisData {
  links: EarFreqPoint[];
  rechts: EarFreqPoint[];
  speech: { stap: number; heard: boolean | null }[];
  tonesHeard: number;
  tonesTotal: number;
  speechHeard: number;
  speechTotal: number;
  scorePct: number;
  profileLabel: string;
  profileDetail: string;
}

function findToneResult(
  results: TestResult[],
  freq: number,
  ear: 'links' | 'rechts'
): TestResult | undefined {
  return results.find(
    (r) =>
      r.type === 'toon' &&
      r.frequentie === freq &&
      (r.oor === ear || r.oor === 'beide')
  );
}

function heardToDb(heard: boolean): number {
  return heard ? 18 : 58;
}

export function buildHearingAnalysis(results: TestResult[]): HearingAnalysisData {
  const links = ANALYSIS_FREQS.map((freq) => {
    const r = findToneResult(results, freq, 'links');
    return { freq, heard: r ? r.antwoord === 'gehoord' : null };
  });

  const rechts = ANALYSIS_FREQS.map((freq) => {
    const r = findToneResult(results, freq, 'rechts');
    return { freq, heard: r ? r.antwoord === 'gehoord' : null };
  });

  const speechResults = results.filter((r) => r.type === 'spraak');
  const speech: { stap: number; heard: boolean | null }[] = speechResults.map((r) => ({
    stap: r.stap_nummer,
    heard: r.antwoord === 'gehoord',
  }));

  const tonePoints = [...links, ...rechts].filter((p) => p.heard !== null);
  const tonesHeard = tonePoints.filter((p) => p.heard).length;
  const tonesTotal = tonePoints.length;

  const speechDone = speech.filter((s) => s.heard !== null);
  const speechHeard = speechDone.filter((s) => s.heard).length;
  const speechTotal = speechDone.length;

  const totalDone = tonesTotal + speechTotal;
  const totalHeard = tonesHeard + speechHeard;
  const scorePct = totalDone > 0 ? Math.round((totalHeard / totalDone) * 100) : 0;

  let profileLabel = 'Onvolledig';
  let profileDetail = 'Nog niet genoeg meetpunten voor een profiel.';

  if (totalDone >= 4) {
    const missRate = 1 - totalHeard / totalDone;
    if (missRate <= 0.15) {
      profileLabel = 'Normaal tot licht';
      profileDetail = 'Toonperceptie grotendeels binnen normaal bereik op de geteste frequenties.';
    } else if (missRate <= 0.4) {
      profileLabel = 'Licht tot matig';
      profileDetail = 'Enkele frequenties vallen weg — geschikt voor ondersteuning bij dagelijks gebruik.';
    } else {
      profileLabel = 'Matig verminderd';
      profileDetail = 'Meerdere frequenties niet waargenomen — adviesgesprek aanbevolen.';
    }
  }

  return {
    links,
    rechts,
    speech,
    tonesHeard,
    tonesTotal,
    speechHeard,
    speechTotal,
    scorePct,
    profileLabel,
    profileDetail,
  };
}

export function earPointsToDbLine(points: EarFreqPoint[]): (number | null)[] {
  return points.map((p) => (p.heard === null ? null : heardToDb(p.heard)));
}

export function formatFreqLabel(freq: number): string {
  if (freq >= 1000) return `${freq / 1000}k`;
  return String(freq);
}
