import { h } from '../dom.js';
import { createChoiceCard } from '../components/choice-card.js';
import { createRocketSvg } from '../components/rocket-svg.js';
import { launchCostM } from '../../core/calculations.js';
import { kg, money, moneyInt, num1, percent } from '../format.js';

export function mountLaunchPlanning(ctx) {
  const { t, data, act } = ctx;

  const cards = new Map();
  const cardEls = data.launchers.map((l) => {
    const card = createChoiceCard({
      title: t(l.nameKey),
      description: t(l.descriptionKey),
      art: createRocketSvg(l.visualSlot, { label: t(l.nameKey) }),
      stats: [
        { label: t('screen.launch.capacity'), value: kg(l.maxPayloadKg) },
        { label: t('screen.launch.cost'), value: '—' },
        { label: t('screen.launch.reliability'), value: percent(l.reliability) },
        { label: t('screen.launch.orbits'), value: l.supportedOrbitIds.map((id) => t(data.byId.orbits.get(id).abbrKey)).join(' · ') },
        { label: t('screen.launch.massVsCapacity'), value: '—' },
      ],
      onSelect: () => act.selectLauncher(l.id),
    });
    cards.set(l.id, card);
    return card.el;
  });

  const summary = h('p', { class: 'launch-summary', 'aria-live': 'polite' });
  const el = h(
    'section',
    { class: 'screen screen--launch' },
    summary,
    h('div', { class: 'choice-list choice-list--row', role: 'radiogroup', 'aria-label': t('screen.launch.title') }, cardEls),
  );

  return {
    el,
    update(state, { indicators: ind, items }) {
      const orbit = items.orbit;
      summary.textContent = `${orbit ? t(orbit.nameKey) : '—'} · ${t('screen.payload.mass')}: ${kg(ind.totalMassKg)} · ${t('screen.review.budgetRemaining')}: ${moneyInt(Math.round(ind.budgetRemainingM * 10) / 10)}`;
      for (const l of data.launchers) {
        const compatible = !orbit || l.supportedOrbitIds.includes(orbit.id);
        const fits = ind.totalMassKg <= l.maxPayloadKg;
        const cost = launchCostM(l, orbit);
        let note = '';
        let tone = 'ok';
        if (!compatible) {
          note = t('screen.launch.incompatible');
          tone = 'bad';
        } else if (!fits) {
          note = t('screen.launch.tooHeavy');
          tone = 'bad';
        } else if (orbit) {
          note = `${t('screen.launch.compatible')} · ${t('screen.launch.fits')}`;
          tone = 'ok';
        }
        cards.get(l.id).set({
          selected: state.launcherId === l.id,
          note,
          noteTone: tone,
          dim: !compatible || !fits,
          values: [undefined, money(cost), undefined, undefined, `${kg(ind.totalMassKg)} / ${kg(l.maxPayloadKg)}`],
        });
      }
      void num1;
    },
  };
}
