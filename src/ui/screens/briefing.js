import { h } from '../dom.js';
import { createChoiceCard } from '../components/choice-card.js';
import { createEarthLimbSvg } from '../components/earth-svg.js';
import { createGoalIcon } from '../icons.js';
import { moneyInt } from '../format.js';

export function mountBriefing(ctx) {
  const { t, data, act } = ctx;
  const g = data.game;

  const cards = new Map();
  const cardEls = data.goals.map((goal) => {
    const card = createChoiceCard({
      title: t(goal.priorityNameKey),
      description: t(goal.descriptionKey),
      art: createGoalIcon(goal.visualVariant),
      stats: [{ label: t('screen.briefing.weights'), value: `×${goal.priorityMultiplier.toFixed(1)}` }],
      onSelect: () => act.selectGoal(goal.id),
    });
    // Benefit and trade-off text, 1-2 sentences each, shown inside the card.
    card.el.querySelector('.choice-card__body').append(
      h('span', { class: 'tradeoff tradeoff--plus' }, h('b', { text: '+ ' }), t(goal.benefitKey)),
      h('span', { class: 'tradeoff tradeoff--minus' }, h('b', { text: '− ' }), t(goal.tradeoffKey)),
    );
    cards.set(goal.id, card);
    return card.el;
  });

  const weightsLine = h('p', { class: 'briefing__weights', 'aria-live': 'polite' });

  const el = h(
    'section',
    { class: 'screen screen--briefing' },
    h(
      'article',
      { class: 'panel panel--mission' },
      h('div', { class: 'mission__banner' }, createEarthLimbSvg({ vivid: true, label: '' }).el),
      h('div', { class: 'mission__head' },
        h('h2', { class: 'mission__name', text: t('screen.briefing.missionName') }),
        h('p', { class: 'mission__tagline', text: t('screen.briefing.missionTagline') })),
      h('div', { class: 'mission__cols' },
        h('div', null,
          h('h2', { class: 'panel__heading', text: t('screen.briefing.objectives') }),
          h('ul', { class: 'bullets' }, data.goals.map((goal) => h('li', null, h('b', { text: `${t(goal.nameKey)}. ` }), t(goal.descriptionKey))))),
        h('div', null,
          h('h2', { class: 'panel__heading', text: t('screen.briefing.conditions') }),
          h('dl', { class: 'facts' },
            h('dt', { text: t('screen.briefing.budget') }), h('dd', { text: moneyInt(g.budgetM) }),
            h('dt', { text: t('screen.briefing.duration') }), h('dd', { text: `${g.durationMonths} ${t('units.months')}` }),
            h('dt', { text: t('screen.briefing.minScience') }), h('dd', { text: String(g.targetSciencePoints) })))),
      h('p', { class: 'fine', text: t('app.disclaimer') }),
    ),
    h(
      'article',
      { class: 'panel panel--priority' },
      h('h2', { class: 'panel__heading', id: 'priority-heading', text: t('screen.briefing.choosePriority') }),
      h('div', { class: 'choice-list', role: 'radiogroup', 'aria-labelledby': 'priority-heading' }, cardEls),
      weightsLine,
      h('p', { class: 'fine', text: t('screen.briefing.priorityNote') }),
    ),
  );

  return {
    el,
    update(state) {
      for (const [id, card] of cards) card.set({ selected: state.goalPriorityId === id });
      const line = data.goals
        .map((goal) => t('screen.briefing.weightLine', { goal: t(goal.nameKey), weight: (goal.id === state.goalPriorityId ? goal.priorityMultiplier : 1).toFixed(1) }))
        .join(' · ');
      weightsLine.textContent = `${t('screen.briefing.weights')}: ${line}`;
    },
  };
}
