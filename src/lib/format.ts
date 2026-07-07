export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatOrderNumber(num: number | null): string {
  if (num === null) return '—';
  return `#${String(num).padStart(8, '0')}`;
}

export function orderMatchesSearch(
  order: { order_nummer: number | null; productnaam: string; land: string },
  leadNaam: string,
  query: string
): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const num = order.order_nummer ? String(order.order_nummer) : '';
  const hashNum = order.order_nummer ? formatOrderNumber(order.order_nummer).toLowerCase() : '';
  return (
    leadNaam.toLowerCase().includes(q) ||
    order.productnaam.toLowerCase().includes(q) ||
    order.land.toLowerCase().includes(q) ||
    num.includes(q.replace('#', '')) ||
    hashNum.includes(q)
  );
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function normalizePhoneForTel(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '#';
}

export function appUrl(path: string): string {
  const base = window.location.origin.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function testUrlForLead(lead: { test_token: string }): string {
  return appUrl(`/test/${lead.test_token}`);
}
