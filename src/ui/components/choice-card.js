import { h } from '../dom.js';

/**
 * Selectable card. `multi` cards behave like checkboxes, others like radio buttons.
 * `stats` is a list of { label, value }. Call set({ selected, note, noteTone, disabledLook }).
 */
export function createChoiceCard({ title, description, stats = [], multi = false, art = null, onSelect, badge = null }) {
  const noteEl = h('p', { class: 'choice-card__note' });
  const statEls = stats.map((st) => {
    const value = h('dd', { text: st.value });
    return { st, value, row: h('div', { class: 'choice-card__stat' }, h('dt', { text: st.label }), value) };
  });
  const el = h(
    'button',
    { type: 'button', class: 'choice-card', role: multi ? 'checkbox' : 'radio', 'aria-checked': 'false', onClick: onSelect },
    art ? h('span', { class: 'choice-card__art', 'aria-hidden': 'true' }, art) : null,
    h(
      'span',
      { class: 'choice-card__body' },
      h('span', { class: 'choice-card__title' }, title, badge ? h('span', { class: 'choice-card__badge', text: badge }) : null),
      description ? h('span', { class: 'choice-card__desc', text: description }) : null,
      statEls.length ? h('dl', { class: 'choice-card__stats' }, statEls.map((x) => x.row)) : null,
      noteEl,
    ),
    h('span', { class: 'choice-card__mark', 'aria-hidden': 'true' }),
  );
  noteEl.hidden = true;

  return {
    el,
    set({ selected = false, note = '', noteTone = 'warn', dim = false, values = null }) {
      el.setAttribute('aria-checked', String(selected));
      el.classList.toggle('is-selected', selected);
      el.classList.toggle('is-dim', dim);
      noteEl.hidden = !note;
      noteEl.textContent = note;
      noteEl.dataset.tone = noteTone;
      if (values) statEls.forEach((x, i) => { if (values[i] !== undefined) x.value.textContent = values[i]; });
    },
  };
}
