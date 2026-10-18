const LONG = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' });

export function formatDate(d: Date): string {
  return LONG.format(d);
}
export function formatMonthYear(d: Date): string {
  return MONTH_YEAR.format(d);
}
export function monthName(month: number): string {
  return MONTH.format(new Date(Date.UTC(2000, month - 1, 1)));
}
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
