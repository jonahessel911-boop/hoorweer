import type { DeliveryStatus, Order } from './types';

export const BEDENKTIJD_DEFAULT_DAYS = 30;

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  offerte: 'Offerte',
  aangemaakt: 'Order aangemaakt',
  in_progress: 'Order in behandeling',
  verzonden: 'Order verzonden',
  aangekomen: 'Order aangekomen',
  bedenktijd: 'Bedenktijd',
  netto_sale: 'Netto sale',
  cancelled: 'Geannuleerd',
};

export const DELIVERY_FLOW: DeliveryStatus[] = [
  'aangemaakt',
  'in_progress',
  'verzonden',
  'aangekomen',
  'bedenktijd',
  'netto_sale',
];

export function getDeliveryLabel(status: DeliveryStatus): string {
  return DELIVERY_LABELS[status];
}

export function isNettoSaleOrder(order: Order): boolean {
  return order.delivery_status === 'netto_sale';
}

export function isCancelledOrder(order: Order): boolean {
  return order.delivery_status === 'cancelled';
}

export function getNextDeliveryStatus(current: DeliveryStatus): DeliveryStatus | null {
  if (current === 'cancelled' || current === 'netto_sale' || current === 'offerte') return null;
  const idx = DELIVERY_FLOW.indexOf(current);
  if (idx === -1 || idx >= DELIVERY_FLOW.length - 1) return null;
  return DELIVERY_FLOW[idx + 1];
}

export function getAdvanceDeliveryUpdates(order: Order): Partial<Order> | null {
  const next = getNextDeliveryStatus(order.delivery_status);
  if (!next) return null;

  const updates: Partial<Order> = { delivery_status: next };
  if (next === 'aangekomen') {
    updates.aangekomen_op = new Date().toISOString();
  }
  if (next === 'bedenktijd' && !order.aangekomen_op) {
    updates.aangekomen_op = new Date().toISOString();
  }
  if (next === 'netto_sale') {
    updates.netto_sale_op = new Date().toISOString();
  }
  return updates;
}

export interface BedenktijdCountdown {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
  totalMs: number;
}

export function getBedenktijdCountdown(
  aangekomenOp: string | null,
  bedenktijdDagen: number
): BedenktijdCountdown | null {
  if (!aangekomenOp) return null;

  const end = new Date(aangekomenOp);
  end.setDate(end.getDate() + bedenktijdDagen);
  const remaining = end.getTime() - Date.now();

  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true, totalMs: 0 };
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, expired: false, totalMs: remaining };
}

export type TimelineStepState = 'completed' | 'active' | 'pending' | 'cancelled' | 'netto';

export function getDeliveryStepState(
  step: DeliveryStatus,
  order: Order
): TimelineStepState {
  if (order.delivery_status === 'cancelled') {
    if (step === 'cancelled') return 'cancelled';
    const from = order.cancelled_from || 'aangemaakt';
    const fromIdx = DELIVERY_FLOW.indexOf(from);
    const stepIdx = DELIVERY_FLOW.indexOf(step);
    if (stepIdx === -1) return 'pending';
    if (stepIdx <= fromIdx) return 'completed';
    return 'pending';
  }

  if (order.delivery_status === 'netto_sale') {
    if (step === 'netto_sale') return 'netto';
    if (step === 'cancelled') return 'pending';
    const idx = DELIVERY_FLOW.indexOf(step);
    return idx >= 0 && idx < DELIVERY_FLOW.length - 1 ? 'completed' : 'pending';
  }

  if (step === 'cancelled') return 'pending';

  const currentIdx = DELIVERY_FLOW.indexOf(order.delivery_status);
  const stepIdx = DELIVERY_FLOW.indexOf(step);

  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export const TIMELINE_STEPS: { key: DeliveryStatus; label: string; isTerminal?: boolean }[] = [
  { key: 'aangemaakt', label: 'Order aangemaakt' },
  { key: 'in_progress', label: 'Order in behandeling' },
  { key: 'verzonden', label: 'Order verzonden' },
  { key: 'aangekomen', label: 'Order aangekomen' },
  { key: 'bedenktijd', label: 'Bedenktijd' },
  { key: 'netto_sale', label: 'Netto sale', isTerminal: true },
  { key: 'cancelled', label: 'Geannuleerd', isTerminal: true },
];
