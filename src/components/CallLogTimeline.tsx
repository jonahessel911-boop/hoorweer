import type { CallLog } from '../lib/types';
import { formatDate } from '../lib/format';
import { CALL_UITKOMST_LABELS } from '../lib/callQueue';

interface CallLogTimelineProps {
  callLogs: CallLog[];
}

export function CallLogTimeline({ callLogs }: CallLogTimelineProps) {
  if (callLogs.length === 0) {
    return (
      <div className="call-timeline call-timeline-empty">
        <p className="crm-muted" style={{ margin: 0 }}>Nog geen belpogingen geregistreerd.</p>
      </div>
    );
  }

  return (
    <div className="call-timeline">
      <h3 className="call-timeline-title">Belgeschiedenis</h3>
      <ul className="call-timeline-list">
        {callLogs.map((log) => (
          <li key={log.id} className="call-timeline-item">
            <span className="call-timeline-dot" />
            <div className="call-timeline-content">
              <span className="call-timeline-outcome">{CALL_UITKOMST_LABELS[log.uitkomst]}</span>
              <span className="call-timeline-time">{formatDate(log.created_at)}</span>
              {log.notitie && <p className="call-timeline-note">{log.notitie}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
