import { useEffect, useState } from 'react';
import type { Order } from '../lib/types';
import {
  TIMELINE_STEPS,
  getDeliveryStepState,
  getBedenktijdCountdown,
  getNextDeliveryStatus,
  type TimelineStepState,
} from '../lib/orderTimeline';
import { formatCurrency } from '../lib/format';

interface OrderTimelineProps {
  order: Order;
}

function stepIcon(state: TimelineStepState): string {
  switch (state) {
    case 'completed':
      return '✓';
    case 'active':
      return '●';
    case 'netto':
      return '✓';
    case 'cancelled':
      return '✕';
    default:
      return '○';
  }
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const [countdown, setCountdown] = useState(
    getBedenktijdCountdown(order.aangekomen_op, order.bedenktijd_dagen)
  );

  useEffect(() => {
    if (order.delivery_status !== 'bedenktijd') return;

    const tick = () => {
      setCountdown(getBedenktijdCountdown(order.aangekomen_op, order.bedenktijd_dagen));
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [order.delivery_status, order.aangekomen_op, order.bedenktijd_dagen]);

  const nextStep = getNextDeliveryStatus(order.delivery_status);
  const nextLabel = nextStep
    ? TIMELINE_STEPS.find((s) => s.key === nextStep)?.label
    : null;

  return (
    <div className="order-timeline">
      {TIMELINE_STEPS.map((step, i) => {
        const state = getDeliveryStepState(step.key, order);
        const isLast = i === TIMELINE_STEPS.length - 1;

        return (
          <div key={step.key} className={`timeline-item timeline-${state}`}>
            <div className="timeline-marker-col">
              <div className={`timeline-marker timeline-marker-${state}`}>
                {stepIcon(state)}
              </div>
              {!isLast && <div className={`timeline-line timeline-line-${state}`} />}
            </div>
            <div className="timeline-content">
              <div className="timeline-label">{step.label}</div>

              {step.key === 'bedenktijd' &&
                (state === 'active' || state === 'completed') &&
                countdown && (
                  <div className={`timeline-countdown ${countdown.expired ? 'expired' : ''}`}>
                    {countdown.expired
                      ? 'Bedenktijd verlopen'
                      : `${countdown.days}d ${countdown.hours}u ${countdown.minutes}m resterend (${order.bedenktijd_dagen} dagen)`}
                  </div>
                )}

              {step.key === 'netto_sale' && state === 'netto' && (
                <div className="timeline-netto-sale">{formatCurrency(Number(order.prijs))}</div>
              )}

              {step.key === 'cancelled' && state === 'cancelled' && order.cancelled_op && (
                <div className="timeline-cancelled">
                  Geannuleerd op{' '}
                  {new Date(order.cancelled_op).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {nextLabel &&
        order.delivery_status !== 'cancelled' &&
        order.delivery_status !== 'netto_sale' && (
          <p className="timeline-next-hint">Volgende stap: {nextLabel}</p>
        )}
    </div>
  );
}
