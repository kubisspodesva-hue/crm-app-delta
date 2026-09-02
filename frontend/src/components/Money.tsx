export function formatMoney(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(num);
}

export function Money({ value }: { value: number | string | null | undefined }) {
  return <>{formatMoney(value)}</>;
}
