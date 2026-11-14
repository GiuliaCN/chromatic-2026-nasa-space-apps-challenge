// Presentation-only helpers that turn a value/limit pair into a status and its text label.
// (The limits themselves come from the data; no game rule is decided here.)

export function limitStatus(t, value, limit) {
  if (limit <= 0) return { status: 'neutral', statusText: '' };
  const ratio = value / limit;
  if (ratio > 1) return { status: 'bad', statusText: t('status.over') };
  if (ratio >= 0.9) return { status: 'warn', statusText: t('status.near') };
  return { status: 'ok', statusText: t('status.ok') };
}

export function targetStatus(t, value, target) {
  return value >= target ? { status: 'ok', statusText: t('status.reached') } : { status: 'warn', statusText: t('status.below') };
}

export function atLeastStatus(t, value, needed) {
  return value >= needed ? { status: 'ok', statusText: t('status.enough') } : { status: 'bad', statusText: t('status.short') };
}

export const maxOf = (list, pick) => list.reduce((m, x) => Math.max(m, pick(x)), 0);
