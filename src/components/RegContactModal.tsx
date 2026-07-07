import { Modal } from './Modal';
import type { ContactUitkomst } from '../lib/types';
import {
  MAX_CONTACT_ATTEMPTS,
  MAX_CONTACT_ATTEMPTS_PER_DAY,
  canCountAttemptToday,
  getTodayCountingAttempts,
} from '../lib/leadStatus';
import type { CallLog } from '../lib/types';

interface RegContactModalProps {
  open: boolean;
  onClose: () => void;
  contactPogingen: number;
  callLogs: CallLog[];
  saving: boolean;
  onNoContact: () => void;
  onOutcome: (uitkomst: ContactUitkomst) => void;
}

export function RegContactModal({
  open,
  onClose,
  contactPogingen,
  callLogs,
  saving,
  onNoContact,
  onOutcome,
}: RegContactModalProps) {
  const countsToday = canCountAttemptToday(callLogs);
  const todayCount = getTodayCountingAttempts(callLogs);
  const nextTotal = countsToday ? contactPogingen + 1 : contactPogingen;
  const isLastAttempt = countsToday && nextTotal >= MAX_CONTACT_ATTEMPTS;

  return (
    <Modal open={open} onClose={onClose} title="Registreer contact">
      <p className="reg-contact-intro">
        Log een belpoging of registereer het resultaat van een gesprek.
        Maximaal {MAX_CONTACT_ATTEMPTS_PER_DAY} pogingen per dag tellen mee richting de {MAX_CONTACT_ATTEMPTS} totaal.
      </p>

      <p className="reg-contact-daily">
        Vandaag: <strong>{todayCount}/{MAX_CONTACT_ATTEMPTS_PER_DAY}</strong> meetellende pogingen
        {!countsToday && (
          <span className="reg-contact-daily-limit"> — daglimiet bereikt, volgende telling morgen</span>
        )}
      </p>

      <div className="reg-contact-section">
        <h3 className="reg-contact-heading">Geen bereik</h3>
        <p className="reg-contact-hint">
          {countsToday ? (
            <>
              Totaal poging {nextTotal} van {MAX_CONTACT_ATTEMPTS}
              {isLastAttempt && ' — daarna wordt de lead automatisch afgeboekt.'}
            </>
          ) : (
            <>Wordt gelogd maar telt vandaag niet meer mee.</>
          )}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onNoContact}
          disabled={saving}
        >
          {saving
            ? 'Opslaan...'
            : countsToday
              ? `Geen bereik (${nextTotal}/${MAX_CONTACT_ATTEMPTS})`
              : 'Geen bereik loggen (telt niet mee vandaag)'}
        </button>
      </div>

      <div className="reg-contact-divider">of contact gehad</div>

      <div className="reg-contact-section">
        <h3 className="reg-contact-heading">Uitkomst gesprek</h3>
        <div className="reg-contact-outcomes">
          <button
            type="button"
            className="btn btn-outcome btn-outcome-terugbellen"
            onClick={() => onOutcome('terugbellen')}
            disabled={saving}
          >
            Geïnteresseerd — terugbellen later
          </button>
          <button
            type="button"
            className="btn btn-outcome btn-outcome-deal"
            onClick={() => onOutcome('deal')}
            disabled={saving}
          >
            Geïnteresseerd — deal
          </button>
          <button
            type="button"
            className="btn btn-outcome btn-outcome-geen"
            onClick={() => onOutcome('geen_interesse')}
            disabled={saving}
          >
            Geen interesse
          </button>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuleren
        </button>
      </div>
    </Modal>
  );
}
