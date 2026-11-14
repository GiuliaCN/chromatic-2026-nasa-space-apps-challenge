import { h } from '../dom.js';

/**
 * A labelled value with an optional capacity bar.
 * set({ value, max, text, status }) where status is 'ok' | 'warn' | 'bad' | 'neutral'.
 * State is also conveyed in text (statusText), never by colour alone.
 */
export function createMetric({ label, icon, accent = '' }) {
  const valueEl = h('span', { class: 'metric__value' });
  const statusEl = h('span', { class: 'metric__status' });
  const fill = h('span', { class: 'metric__fill' });
  const bar = h('span', { class: 'metric__bar', role: 'meter', 'aria-label': label, 'aria-valuemin': 0 }, fill);
  const el = h(
    'div',
    { class: `metric ${accent}` },
    h('div', { class: 'metric__head' }, icon ? h('span', { class: 'metric__icon', 'aria-hidden': 'true' }, icon) : null, h('span', { class: 'metric__label', text: label }), valueEl),
    bar,
    statusEl,
  );

  return {
    el,
    set({ value = 0, max = 0, text = '', status = 'neutral', statusText = '' }) {
      valueEl.textContent = text;
      const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
      fill.style.width = `${Math.round(ratio * 100)}%`;
      bar.setAttribute('aria-valuemax', String(max));
      bar.setAttribute('aria-valuenow', String(Math.round(value)));
      bar.hidden = max <= 0;
      el.dataset.status = status;
      statusEl.textContent = statusText;
      statusEl.hidden = !statusText;
    },
  };
}

/** A plain label/value row (no bar). */
export function createStat({ label }) {
  const valueEl = h('span', { class: 'stat__value' });
  const el = h('div', { class: 'stat' }, h('span', { class: 'stat__label', text: label }), valueEl);
  return {
    el,
    set(text, status = 'neutral') {
      valueEl.textContent = text;
      el.dataset.status = status;
    },
  };
}
