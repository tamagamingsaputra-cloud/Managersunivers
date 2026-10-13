const money = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const longDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const formatMoney = (n: number): string => money.format(n);
export const formatDate = (iso: string): string => longDate.format(new Date(`${iso}T00:00:00Z`));
export const formatShortDate = (iso: string): string => shortDate.format(new Date(`${iso}T00:00:00Z`));
