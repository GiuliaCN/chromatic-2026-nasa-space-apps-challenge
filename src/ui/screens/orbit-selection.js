import { h, clear } from '../dom.js';
import { createChoiceCard } from '../components/choice-card.js';
import { createOrbitEarthSvg } from '../components/earth-svg.js';
import { num } from '../format.js';

const LEGEND_COLOR = { leo: '#00e5ff', 'sun-synchronous': '#ffbf36', equatorial: '#39f58a' };

export function mountOrbitSelection(ctx) {
  const { t, data, act } = ctx;
  const earth = createOrbitEarthSvg({ label: t('screen.orbit.title') });

  const cards = new Map();
  const cardEls = data.orbits.map((orbit) => {
    const card = createChoiceCard({
      title: t(orbit.nameKey),
      description: t(orbit.descriptionKey),
      stats: [{ label: t('screen.orbit.launchCost'), value: t('screen.orbit.launchCostValue', { value: orbit.launchCostMultiplier.toFixed(2) }) }],
      onSelect: () => act.selectOrbit(orbit.id),
    });
    cards.set(orbit.id, card);
    return card.el;
  });

  const detail = h('article', { class: 'panel panel--orbit-detail', 'aria-live': 'polite' });
  const strip = h('div', { class: 'orbit-strip' });
  const legend = h(
    'ul',
    { class: 'orbit-legend' },
    data.orbits.map((o) => h('li', null, h('span', { class: 'swatch', style: `background:${LEGEND_COLOR[o.id] ?? '#fff'}` }), t(o.nameKey))),
  );

  const el = h(
    'section',
    { class: 'screen screen--orbit' },
    detail,
    h('article', { class: 'panel panel--earth' }, legend, earth.el, strip, h('p', { class: 'fine', text: t('screen.orbit.legendNote') })),
    h('article', { class: 'panel' },
      h('h3', { class: 'panel__heading', id: 'orbit-heading', text: t('screen.orbit.choose') }),
      h('div', { class: 'choice-list', role: 'radiogroup', 'aria-labelledby': 'orbit-heading' }, cardEls)),
  );

  function fact(label, value) {
    return h('div', { class: 'orbit-fact' }, h('dt', { text: label }), h('dd', { text: value }));
  }

  return {
    el,
    update(state) {
      for (const [id, card] of cards) card.set({ selected: state.orbitId === id });
      earth.update(state.orbitId);
      const orbit = data.byId.orbits.get(state.orbitId);
      clear(detail);
      clear(strip);
      if (!orbit) {
        detail.append(h('h3', { class: 'panel__heading', text: t('screen.orbit.choose') }), h('p', { class: 'muted', text: t('screen.orbit.pickFirst') }));
        return;
      }
      detail.append(
        h('h3', { class: 'panel__title', text: t(orbit.nameKey) }),
        h('p', { text: t(orbit.descriptionKey) }),
        h('h4', { class: 'panel__heading', text: t('screen.orbit.keyParameters') }),
        h('dl', { class: 'orbit-facts' },
          fact(t('screen.orbit.altitude'), `${num(orbit.altitudeKm)} ${t('units.km')}`),
          fact(t('screen.orbit.inclination'), `${orbit.inclinationDeg}°`),
          fact(t('screen.orbit.revisit'), t(orbit.revisitKey)),
          fact(t('screen.orbit.eclipse'), `${orbit.eclipseDurationH.toFixed(1)} ${t('units.hours')}`),
          fact(t('screen.orbit.launchCost'), t('screen.orbit.launchCostValue', { value: orbit.launchCostMultiplier.toFixed(2) }))),
        h('h4', { class: 'panel__heading', text: t('screen.orbit.observation') }),
        h('ul', { class: 'obs-list' }, data.goals.map((g) => h('li', null, h('span', { text: t(g.nameKey) }), h('b', { text: `×${orbit.observationMultiplierByGoal[g.id].toFixed(2)}` })))),
        h('p', { class: 'coverage' }, h('b', { text: `${t('screen.orbit.coverage')}: ` }), t(orbit.coverageKey)),
        h('div', { class: 'pros-cons' },
          h('div', { class: 'pros' }, h('h4', { text: `＋ ${t('screen.orbit.advantages')}` }), h('ul', null, t.list(orbit.advantagesKey).map((x) => h('li', { text: x })))),
          h('div', { class: 'cons' }, h('h4', { text: `－ ${t('screen.orbit.disadvantages')}` }), h('ul', null, t.list(orbit.disadvantagesKey).map((x) => h('li', { text: x }))))),
      );
      strip.append(
        h('div', null, h('small', { text: t('screen.orbit.altitude') }), h('b', { text: `${num(orbit.altitudeKm)} ${t('units.km')}` })),
        h('div', null, h('small', { text: t('screen.orbit.inclination') }), h('b', { text: `${orbit.inclinationDeg}°` })),
        h('div', null, h('small', { text: t('screen.orbit.revisit') }), h('b', { text: t(orbit.revisitKey) })),
      );
    },
  };
}
