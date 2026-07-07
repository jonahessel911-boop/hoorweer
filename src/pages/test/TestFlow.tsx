import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustomerLayout } from '../../components/CustomerLayout';
import { CheckAnimation } from '../../components/CheckAnimation';
import {
  fetchLeadByToken,
  updateLead,
  createTestResult,
  fetchTestResults,
} from '../../lib/db';
import { playTone } from '../../lib/audio';
import { TEST_STEPS, TOTAL_STEPS, stepProgressLabel } from '../../lib/testSteps';
import { sendTestCompleteEmail } from '../../lib/emailApi';
import type { Lead, Antwoord } from '../../lib/types';

type Phase = 'welcome' | 'testing' | 'complete';

export function TestFlow() {
  const { token } = useParams<{ token: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [answer, setAnswer] = useState<Antwoord | null>(null);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await fetchLeadByToken(token!);
        if (cancelled) return;

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setLead(data);

        if (data.status === 'test_afgerond') {
          setPhase('complete');
        } else if (data.status === 'test_gestart') {
          const { data: results } = await fetchTestResults(data.id);
          if (cancelled) return;
          const completedSteps = results.length;
          if (completedSteps > 0 && completedSteps < TOTAL_STEPS) {
            setCurrentStep(completedSteps);
            setPhase('testing');
          } else if (completedSteps >= TOTAL_STEPS) {
            setPhase('complete');
          }
        } else if (data.status === 'nieuw' || data.status === 'test_verzonden') {
          await updateLead(data.id, { status: 'test_gestart' });
          if (!cancelled) {
            setLead({ ...data, status: 'test_gestart' });
          }
        } else {
          const { data: results } = await fetchTestResults(data.id);
          if (cancelled) return;
          if (results.length > 0 && results.length < TOTAL_STEPS) {
            setCurrentStep(results.length);
            setPhase('testing');
          } else if (results.length >= TOTAL_STEPS) {
            setPhase('complete');
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError('Er ging iets mis bij het laden. Vernieuw de pagina en probeer opnieuw.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleStart = async () => {
    if (lead && lead.status !== 'test_gestart' && lead.status !== 'test_afgerond') {
      const { error } = await updateLead(lead.id, { status: 'test_gestart' });
      if (error) {
        setLoadError('Kon hoortest niet starten. Probeer opnieuw.');
        return;
      }
      setLead({ ...lead, status: 'test_gestart' });
    }
    setPhase('testing');
  };

  const handlePlay = async () => {
    const step = TEST_STEPS[currentStep];
    setPlaying(true);

    try {
      if (step.type === 'toon' && step.frequentie && step.oor) {
        await playTone(step.frequentie, step.oor);
      }
    } finally {
      setPlaying(false);
    }
  };

  const handleAnswer = (antwoord: Antwoord) => {
    setAnswer(antwoord);
  };

  const handleNext = async () => {
    if (!lead || !answer) return;
    setSaving(true);

    try {
      const step = TEST_STEPS[currentStep];
      const { error: saveError } = await createTestResult({
        lead_id: lead.id,
        stap_nummer: step.stap,
        type: step.type,
        frequentie: step.frequentie || null,
        oor: step.oor || null,
        antwoord: answer,
      });
      if (saveError) {
        setLoadError(saveError);
        return;
      }

      if (currentStep < TOTAL_STEPS - 1) {
        setCurrentStep(currentStep + 1);
        setAnswer(null);
      } else {
        const { error: statusError } = await updateLead(lead.id, { status: 'test_afgerond' });
        if (statusError) {
          setLoadError('Test voltooid maar status kon niet worden bijgewerkt.');
          return;
        }
        if (lead.email) {
          await sendTestCompleteEmail({ to: lead.email, naam: lead.naam });
        }
        setLead({ ...lead, status: 'test_afgerond' });
        setPhase('complete');
      }
    } catch {
      setLoadError('Kon antwoord niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <p style={{ textAlign: 'center' }}>Laden...</p>
      </CustomerLayout>
    );
  }

  if (loadError) {
    return (
      <CustomerLayout>
        <div className="error-page">
          <h1>Fout bij laden</h1>
          <p>{loadError}</p>
        </div>
      </CustomerLayout>
    );
  }

  if (notFound || !lead) {
    return (
      <CustomerLayout>
        <div className="error-page">
          <h1>Link niet gevonden</h1>
          <p>Deze testlink is ongeldig of verlopen. Neem contact op met HearDirect.</p>
        </div>
      </CustomerLayout>
    );
  }

  if (phase === 'welcome') {
    return (
      <CustomerLayout>
        <div className="card card-lg">
          <h1 className="welcome-title">Welkom {lead.naam}</h1>
          <p className="welcome-text">
            Deze hoortest duurt ongeveer 7 minuten. Eerst stellen we u een paar korte
            vragen over uw gehoor in het dagelijks leven. Daarna hoort u 10 tonen — elk oor
            apart. Gebruik een koptelefoon en zorg voor een rustige omgeving.
          </p>
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={handleStart}>
              Start hoortest
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (phase === 'complete') {
    return (
      <CustomerLayout>
        <div className="card card-lg" style={{ textAlign: 'center' }}>
          <CheckAnimation />
          <h1 className="completion-title">
            Uw resultaat is naar de specialist gestuurd
          </h1>
          <p className="completion-text">
            Wij hebben nieuws voor u. Onze specialist neemt binnen 24 uur contact met u op.
          </p>
        </div>
      </CustomerLayout>
    );
  }

  const step = TEST_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;
  const isQuestion = step.type === 'vraag';

  return (
    <CustomerLayout>
      <div className="card card-lg">
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-label">
          {stepProgressLabel(currentStep)} · Stap {currentStep + 1} van {TOTAL_STEPS}
        </p>

        <h2 className="step-title">{step.label}</h2>

        {!isQuestion && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              className="btn btn-secondary btn-lg"
              onClick={handlePlay}
              disabled={playing}
              style={{ maxWidth: '100%' }}
            >
              {playing ? '▶ Audio speelt...' : '▶ Speel audio af'}
            </button>
          </div>
        )}

        <div className="answer-buttons">
          <button
            className={`answer-btn ${answer === 'gehoord' ? 'selected-yes' : ''}`}
            onClick={() => handleAnswer('gehoord')}
          >
            {isQuestion ? 'Ja' : 'Ja, gehoord'}
          </button>
          <button
            className={`answer-btn ${answer === 'niet_gehoord' ? 'selected-no' : ''}`}
            onClick={() => handleAnswer('niet_gehoord')}
          >
            {isQuestion ? 'Nee' : 'Nee, niet gehoord'}
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleNext}
            disabled={!answer || saving}
          >
            {saving ? 'Opslaan...' : currentStep < TOTAL_STEPS - 1 ? 'Volgende' : 'Test afronden'}
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}
