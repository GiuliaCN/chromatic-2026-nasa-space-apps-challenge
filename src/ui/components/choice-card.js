import { h } from '../dom.js';

/**
 * Selectable card. `multi` cards behave like checkboxes, others like radio buttons.
 * `stats` is a list of { label, value }. Call set({ selected, note, noteTone, disabledLook }).
 */
export function createChoiceCard({ title, description, stats = [], multi = false, art = null, onSelect, badge = null, reference = null }) {
  const noteEl = h('p', { class: 'choice-card__note' });
  const statEls = stats.map((st) => {
    const value = h('dd', { text: st.value });
    return { st, value, row: h('div', { class: 'choice-card__stat' }, h('dt', { text: st.label }), value) };
  });
  const titleEl = h('span', { class: 'choice-card__title' }, title, badge ? h('span', { class: 'choice-card__badge', text: badge }) : null);
  const descEl = description ? h('span', { class: 'choice-card__desc', text: description }) : null;
  const statsEl = statEls.length ? h('dl', { class: 'choice-card__stats' }, statEls.map((x) => x.row)) : null;
  const markEl = h('span', { class: 'choice-card__mark', 'aria-hidden': 'true' });
  const artEl = art ? h('span', { class: 'choice-card__art', 'aria-hidden': 'true' }, art) : null;
  const role = multi ? 'checkbox' : 'radio';
  noteEl.hidden = true;

  let el;
  let control;
  if (reference?.url) {
    // A link cannot live inside a button, so the visible card is a div and the button is an
    // invisible, card-sized hit area underneath it. The link sits above the hit area.
    const uid = `cc${(createChoiceCard.count = (createChoiceCard.count ?? 0) + 1)}`;
    titleEl.id = `${uid}-t`;
    const details = h('span', { id: `${uid}-d`, hidden: true });
    control = h('button', { type: 'button', class: 'choice-card__hit', role, 'aria-checked': 'false', 'aria-labelledby': `${uid}-t`, 'aria-describedby': `${uid}-d`, onClick: onSelect });
    const refEl = h('span', { class: 'choice-card__ref' },
      h('a', { href: reference.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${reference.label} (${reference.newTabLabel})`, text: reference.label }));
    el = h('div', { class: `choice-card choice-card--ref${multi ? ' choice-card--multi' : ''}` },
      control, artEl,
      h('span', { class: 'choice-card__body' }, titleEl, refEl, descEl, statsEl, noteEl),
      markEl, details);
    // Screen readers get the stats through the button's description.
    const syncDetails = () => { details.textContent = [descEl?.textContent, ...statEls.map((x) => `${x.st.label} ${x.value.textContent}`)].filter(Boolean).join('. '); };
    syncDetails();
    el.syncDetails = syncDetails;
  } else {
    control = h('button', { type: 'button', class: 'choice-card', role, 'aria-checked': 'false', onClick: onSelect },
      artEl, h('span', { class: 'choice-card__body' }, titleEl, descEl, statsEl, noteEl), markEl);
    el = control;
  }

  return {
    el,
    control,
    set({ selected = false, note = '', noteTone = 'warn', dim = false, values = null }) {
      control.setAttribute('aria-checked', String(selected));
      el.classList.toggle('is-selected', selected);
      el.classList.toggle('is-dim', dim);
      noteEl.hidden = !note;
      noteEl.textContent = note;
      noteEl.dataset.tone = noteTone;
      if (values) statEls.forEach((x, i) => { if (values[i] !== undefined) x.value.textContent = values[i]; });
      el.syncDetails?.();
    },
  };
}
