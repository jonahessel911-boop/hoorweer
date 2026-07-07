import type { Lead, LeadStatus, OrderStatus, DeliveryStatus } from '../lib/types';
import { getDeliveryLabel } from '../lib/orderTimeline';
import { getLeadDisplayLabel, LEAD_STATUS_LABELS, CONTACT_UITKOMST_LABELS } from '../lib/leadStatus';

const ORDER_LABELS: Record<OrderStatus, string> = {
  offerte_aangemaakt: 'Offerte aangemaakt',
  offerte_verzonden: 'Offerte verzonden',
  ondertekend: 'Ondertekend',
  betaallink_verzonden: 'Betaallink verzonden',
  betaald: 'Betaald',
};

export function getStatusLabel(status: LeadStatus | OrderStatus): string {
  return status in LEAD_STATUS_LABELS
    ? LEAD_STATUS_LABELS[status as LeadStatus]
    : ORDER_LABELS[status as OrderStatus];
}

export function getLeadStatusLabel(lead: Lead): string {
  if (lead.contact_uitkomst) {
    return CONTACT_UITKOMST_LABELS[lead.contact_uitkomst];
  }
  return getLeadDisplayLabel(lead);
}

interface StatusBadgeProps {
  status: LeadStatus | OrderStatus;
  lead?: Lead;
}

/** Colored badge — use on detail pages only */
export function StatusBadge({ status, lead }: StatusBadgeProps) {
  const label = lead ? getLeadStatusLabel(lead) : getStatusLabel(status);
  const badgeClass = lead?.contact_uitkomst
    ? `badge-uitkomst-${lead.contact_uitkomst}`
    : `badge-${status}`;
  return <span className={`badge ${badgeClass}`}>{label}</span>;
}

interface StatusTextProps {
  status: LeadStatus | OrderStatus;
  lead?: Lead;
}

/** Plain text status for list tables */
export function StatusText({ status, lead }: StatusTextProps) {
  const label = lead ? getLeadStatusLabel(lead) : getStatusLabel(status);
  return <span className="status-text">{label}</span>;
}

interface DeliveryTextProps {
  status: DeliveryStatus;
}

export function DeliveryText({ status }: DeliveryTextProps) {
  const className =
    status === 'netto_sale'
      ? 'delivery-text delivery-netto'
      : status === 'cancelled'
        ? 'delivery-text delivery-cancelled'
        : 'delivery-text';

  return <span className={className}>{getDeliveryLabel(status)}</span>;
}
