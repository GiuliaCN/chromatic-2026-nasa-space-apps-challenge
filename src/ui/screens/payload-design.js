import { h, clear } from '../dom.js';
import { createChoiceCard } from '../components/choice-card.js';
import { createMetric } from '../components/metric.js';
import { createSpacecraftSvg } from '../components/spacecraft-svg.js';
import { createIcon } from '../icons.js';
import { gbMonth, kg, num1, money, pts, watts } from '../format.js';
import { limitStatus, maxOf, targetStatus } from '../status.js';

export function mountPayloadDesign(ctx) {
  const { t, data, act } = ctx;
  const sc = createSpacecraftSvg({ t });

  const metrics = {
    cost: createMetric({ label: t('screen.payload.cost'), icon: createIcon('cost') }),
    mass: createMetric({ label: t('screen.payload.mass'), icon: createIcon('mass') }),
    power: createMetric({ label: t('screen.payload.power'), icon: createIcon('power') }),
    data: createMetric({ label: t('screen.payload.data'), icon: createIcon('data') }),
    science: createMetric({ label: t('screen.payload.science'), icon: createIcon('science'), accent: 'metric--science' }),
  };
  const maxMass = maxOf(data.launchers, (l) => l.maxPayloadKg);
  const maxPower = maxOf(data.powers, (p) => p.generationW);
  const maxData = maxOf(data.comms, (c) => c.downlinkGbPerMonth);

  let focusId = data.payloads[0]?.id;
  const whyTitle = h('h4', { class: 'why__title' });
  const whyText = h('p', { class: 'why__text' });
  const setFocus = (id) => {
    focusId = id;
    const p = data.byId.payloads.get(id);
    whyTitle.textContent = t(p.nameKey);
    whyText.textContent = t(p.descriptionKey);
  };
  setFocus(focusId);

  const cards = new Map();
  const cardEls = data.payloads.map((p) => {
    const base = Object.values(p.scienceByGoal).reduce((a, b) => a + b, 0);
    const card = createChoiceCard({
      title: t(p.nameKey),
      multi: true,
      stats: [
        { label: t('screen.payload.baseScience'), value: `${base} ${t('units.pts')}` },
        { label: t('screen.payload.mass'), value: kg(p.massKg) },
        { label: t('screen.payload.power'), value: watts(p.powerW) },
        { label: t('screen.payload.dataShort'), value: gbMonth(p.dataGbPerMonth) },
      ],
      onSelect: () => {
        setFocus(p.id);
        act.togglePayload(p.id);
      },
    });
    card.el.addEventListener('focus', () => setFocus(p.id));
    card.el.addEventListener('mouseenter', () => setFocus(p.id));
    cards.set(p.id, card);
    return card.el;
  });

  const slotsEl = h('ul', { class: 'slots', 'aria-label': t('screen.payload.selected', { count: 0, total: data.payloads.length }) });
  const slotsTitle = h('h4', { class: 'panel__heading' });
  const totalEl = h('p', { class: 'slots__total' });

  const el = h(
    'section',
    { class: 'screen screen--payload' },
    h('article', { class: 'panel' },
      h('h3', { class: 'panel__title', text: t('screen.payload.summary') }),
      h('p', { class: 'panel__sub', text: t('screen.payload.summaryHint') }),
      Object.values(metrics).map((m) => m.el)),
    h('article', { class: 'panel panel--stage' },
      h('div', { class: 'pill', text: t('screen.payload.configuration') }),
      h('div', { class: 'stage' }, sc.el),
      slotsTitle,
      slotsEl,
      totalEl),
    h('article', { class: 'panel' },
      h('h3', { class: 'panel__title', text: t('screen.payload.selection') }),
      h('p', { class: 'panel__sub', text: t('screen.payload.selectionHint') }),
      h('div', { class: 'choice-list choice-list--dense', role: 'group', 'aria-label': t('screen.payload.selection') }, cardEls),
      h('div', { class: 'why' }, h('h4', { class: 'why__head', text: t('nav.why') }), whyTitle, whyText)),
  );

  return {
    el,
    update(state, { indicators: ind, items }) {
      for (const [id, card] of cards) card.set({ selected: state.payloadIds.includes(id) });
      sc.update(items);

      metrics.cost.set({ value: ind.totalCostM, max: ind.budgetM, text: `${num1(ind.totalCostM)} / ${ind.budgetM} ${t('units.m')}`, ...limitStatus(t, ind.totalCostM, ind.budgetM) });
      metrics.mass.set({ value: ind.totalMassKg, max: maxMass, text: `${kg(ind.totalMassKg)} / ${kg(maxMass)}`, ...limitStatus(t, ind.totalMassKg, maxMass) });
      metrics.power.set({ value: ind.totalPowerDemandW, max: maxPower, text: `${watts(ind.totalPowerDemandW)} / ${watts(maxPower)}`, ...limitStatus(t, ind.totalPowerDemandW, maxPower) });
      metrics.data.set({ value: ind.payloadDataGbPerMonth, max: maxData, text: `${gbMonth(ind.payloadDataGbPerMonth)}`, ...limitStatus(t, ind.payloadDataGbPerMonth, maxData) });
      const target = data.game.targetSciencePoints;
      metrics.science.set({ value: ind.sciencePotentialTotal, max: target, text: `${pts(ind.sciencePotentialTotal)} · ${t('screen.payload.target', { target })}`, ...targetStatus(t, ind.sciencePotentialTotal, target) });

      slotsTitle.textContent = t('screen.payload.selected', { count: state.payloadIds.length, total: data.payloads.length });
      clear(slotsEl);
      for (let i = 0; i < data.payloads.length; i += 1) {
        const id = state.payloadIds[i];
        const p = id ? data.byId.payloads.get(id) : null;
        slotsEl.append(
          p
            ? h('li', { class: 'slot slot--filled' }, h('span', { text: t(p.nameKey) }), h('button', { type: 'button', class: 'slot__remove', 'aria-label': `${t('nav.edit')}: ${t(p.nameKey)} ✕`, onClick: () => act.togglePayload(p.id), text: '✕' }))
            : h('li', { class: 'slot slot--empty', 'aria-hidden': 'true', text: '+' }),
        );
      }
      totalEl.textContent = state.payloadIds.length === 0 ? t('screen.payload.none') : `${t('screen.payload.science')}: ${pts(ind.sciencePotentialTotal)} · ${money(ind.payloadCostM)}`;
      totalEl.dataset.empty = String(state.payloadIds.length === 0);
    },
  };
}
