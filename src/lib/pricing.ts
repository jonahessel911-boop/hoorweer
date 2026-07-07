export function calcFinalPrice(listprijs: number, kortingBedrag: number): number {
  return Math.max(0, Math.round((listprijs - kortingBedrag) * 100) / 100);
}

export function formatEuro(amount: number): string {
  return `€ ${amount.toFixed(2)}`;
}
