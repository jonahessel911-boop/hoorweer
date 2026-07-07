import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeLeads } from '../../../hooks/useRealtimeLeads';
import { useRealtimeCallLogs } from '../../../hooks/useRealtimeCallLogs';
import { createCallLog, fetchTestResults, subscribeToChanges, updateLead } from '../../../lib/db';
import {
  applyCallOutcome,
  CALL_SCREEN_OUTCOME_LABELS,
  countTodayCallAttempts,
  getHoortestLabel,
  getLeadStatusLabelForCall,
  getNextLeadInQueue,
  sortCallQueue,
  type CallScreenOutcome,
} from '../../../lib/callQueue';
import { formatDate, normalizePhoneForTel } from '../../../lib/format';
import { MAX_CONTACT_ATTEMPTS, normalizeLead } from '../../../lib/leadStatus';
import { CopyField } from '../../../components/CopyField';
import { BellenHearingCard } from '../../../components/BellenHearingCard';
import { BellenOfferPanel } from '../../../components/BellenOfferPanel';
import type { TestResult } from '../../../lib/types';

export function BellenTab() {
  const { leads, loading: leadsLoading, refetch: refetchLeads } = useRealtimeLeads();
  const { callLogs, loading: logsLoading, refetch: refetchLogs } = useRealtimeCallLogs();

  const queue = useMemo(() => sortCallQueue(leads), [leads]);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<CallScreenOutcome | null>(null);
  const [notitie, setNotitie] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testResultsLoading, setTestResultsLoading] = useState(false);

  const currentLead = useMemo(() => {
    if (!currentLeadId) return queue[0] ?? null;
    const fromQueue = queue.find((l) => l.id === currentLeadId);
    if (fromQueue) return fromQueue;
    const fromAll = leads.find((l) => l.id === currentLeadId);
    if (fromAll && queue.some((l) => l.id === currentLeadId)) return fromAll;
    return queue[0] ?? null;
  }, [currentLeadId, queue, leads]);

  useEffect(() => {
    if (!currentLeadId && queue.length > 0) {
      setCurrentLeadId(queue[0].id);
    }
  }, [currentLeadId, queue]);

  useEffect(() => {
    if (currentLeadId && queue.length > 0 && !queue.some((l) => l.id === currentLeadId)) {
      setCurrentLeadId(queue[0].id);
      setSelectedOutcome(null);
      setNotitie('');
    }
    if (queue.length === 0) {
      setCurrentLeadId(null);
    }
  }, [queue, currentLeadId]);

  useEffect(() => {
    if (!currentLeadId) {
      setTestResults([]);
      return;
    }
    let cancelled = false;

    const loadResults = () => {
      setTestResultsLoading(true);
      fetchTestResults(currentLeadId).then(({ data }) => {
        if (!cancelled) {
          setTestResults(data || []);
          setTestResultsLoading(false);
        }
      });
    };

    loadResults();
    const unsubscribe = subscribeToChanges(loadResults);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentLeadId]);

  const todayAttempts = useMemo(() => countTodayCallAttempts(callLogs), [callLogs]);

  const handleVolgende = useCallback(async () => {
    if (!currentLead || !selectedOutcome || saving) return;

    setSaving(true);
    setError(null);

    const trimmedNote = notitie.trim() || null;
    const result = applyCallOutcome(currentLead, selectedOutcome, trimmedNote);

    const logRes = await createCallLog(result.callLog);
    if (logRes.error) {
      setError(logRes.error);
      setSaving(false);
      return;
    }

    const updateRes = await updateLead(currentLead.id, result.leadUpdates);
    if (updateRes.error) {
      setError(updateRes.error);
      setSaving(false);
      return;
    }

    await Promise.all([refetchLeads(), refetchLogs()]);

    const updatedLeads = leads.map((l) =>
      l.id === currentLead.id ? { ...l, ...result.leadUpdates } : l
    );
    const next = getNextLeadInQueue(updatedLeads, currentLead.id);

    setCurrentLeadId(next?.id ?? null);
    setSelectedOutcome(null);
    setNotitie('');
    setSaving(false);
  }, [
    currentLead,
    selectedOutcome,
    saving,
    notitie,
    leads,
    refetchLeads,
    refetchLogs,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA') return;
      if (!selectedOutcome || saving || !currentLead) return;
      e.preventDefault();
      handleVolgende();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedOutcome, saving, currentLead, handleVolgende]);

  if (leadsLoading || logsLoading) {
    return <p>Laden...</p>;
  }

  if (queue.length === 0) {
    return (
      <div className="bellen-empty">
        <div className="bellen-empty-card card">
          <span className="bellen-empty-icon">✓</span>
          <h1 className="bellen-empty-title">Alle leads gebeld</h1>
          <p className="bellen-empty-sub">
            {todayAttempts === 0
              ? 'Geen belpogingen vandaag.'
              : `${todayAttempts} belpoging${todayAttempts === 1 ? '' : 'en'} vandaag`}
          </p>
        </div>
      </div>
    );
  }

  if (!currentLead) {
    return <p>Laden...</p>;
  }

  const normalized = normalizeLead(currentLead);
  const attemptDisplay = Math.min(normalized.contact_pogingen + 1, MAX_CONTACT_ATTEMPTS);
  const telHref = normalizePhoneForTel(currentLead.telefoon);

  return (
    <div className="bellen-tab">
      <div className="tab-header bellen-header">
        <div>
          <h1 className="page-title">Bellen</h1>
          <p className="bellen-queue-meta">
            {queue.length} in wachtrij · nieuwste eerst
          </p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="bellen-layout">
        <div className="bellen-card card card-lg">
        <div className="bellen-card-top">
          <h2 className="bellen-lead-name">{currentLead.naam}</h2>
          <span className="bellen-attempt-badge">
            Poging {attemptDisplay} van {MAX_CONTACT_ATTEMPTS}
          </span>
        </div>

        <div className="bellen-fields">
          <CopyField label="Naam" value={currentLead.naam} />
          <CopyField label="Telefoon" value={currentLead.telefoon} href={telHref} />
          <CopyField label="E-mail" value={currentLead.email || ''} />
        </div>

        <div className="bellen-meta-grid">
          <div className="bellen-meta-item">
            <span className="bellen-meta-label">Laatste belpoging</span>
            <span className="bellen-meta-value">
              {normalized.laatste_belpoging ? formatDate(normalized.laatste_belpoging) : '—'}
            </span>
          </div>
          <div className="bellen-meta-item">
            <span className="bellen-meta-label">Leadstatus</span>
            <span className="bellen-meta-value">{getLeadStatusLabelForCall(currentLead)}</span>
          </div>
          <div className="bellen-meta-item">
            <span className="bellen-meta-label">Hoortest</span>
            <span className="bellen-meta-value">{getHoortestLabel(currentLead)}</span>
          </div>
        </div>

        <div className="bellen-outcomes">
          <p className="bellen-outcomes-label">Uitkomst van deze poging</p>
          <div className="bellen-outcome-grid">
            {(Object.keys(CALL_SCREEN_OUTCOME_LABELS) as CallScreenOutcome[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`bellen-outcome-btn bellen-outcome-${key} ${selectedOutcome === key ? 'bellen-outcome-selected' : ''}`}
                onClick={() => setSelectedOutcome(key)}
                disabled={saving}
              >
                {CALL_SCREEN_OUTCOME_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="bellen-note">
          <label htmlFor="bellen-notitie" className="bellen-note-label">
            Notitie
            {selectedOutcome === 'bel_later_terug' && (
              <span className="bellen-note-hint"> — terugbeltijd / afspraak</span>
            )}
          </label>
          <textarea
            id="bellen-notitie"
            className="form-input bellen-note-input"
            rows={2}
            value={notitie}
            onChange={(e) => setNotitie(e.target.value)}
            placeholder="Optionele notitie bij deze poging…"
            disabled={saving}
          />
        </div>

        <div className="bellen-actions">
          <button
            type="button"
            className="btn btn-primary btn-bellen-next"
            onClick={handleVolgende}
            disabled={!selectedOutcome || saving}
          >
            {saving ? 'Opslaan…' : 'Volgende →'}
          </button>
          {!selectedOutcome && (
            <span className="bellen-hint">Kies een uitkomst om door te gaan (Enter)</span>
          )}
        </div>
        </div>

        <aside className="bellen-sidebar">
          <BellenHearingCard
            lead={currentLead}
            testResults={testResults}
            loading={testResultsLoading}
          />
          <BellenOfferPanel lead={currentLead} />
        </aside>
      </div>
    </div>
  );
}
