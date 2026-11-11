const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Latin digits → Persian digits, so counters and dates read natively. */
export function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

export function shortTitle(text: string, max = 42): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'د';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

export type DayBucket = 'today' | 'yesterday' | 'older' | 'unknown';

export function dayBucket(iso?: string | null): DayBucket {
  if (!iso) return 'unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (time >= startOfToday) return 'today';
  if (time >= startOfToday - oneDay) return 'yesterday';
  return 'older';
}

export const DAY_LABELS: Record<Exclude<DayBucket, 'unknown'>, string> = {
  today: 'امروز',
  yesterday: 'دیروز',
  older: 'پیش‌تر',
};

export function groupLabel(bucket: DayBucket): string {
  return bucket === 'unknown' ? '' : DAY_LABELS[bucket];
}
