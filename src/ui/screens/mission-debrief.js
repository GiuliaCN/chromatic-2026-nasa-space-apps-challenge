import { h } from '../dom.js';
import { createSpacecraftSvg } from '../components/spacecraft-svg.js';
import { createEarthLimbSvg } from '../components/earth-svg.js';
import { createMetric } from '../components/metric.js';
import { createIcon } from '../icons.js';
import { gb, moneyInt, num, num1, percent } from '../format.js';

export function mountMissionDebrief(ctx) {
  const { t, data, act } = ctx;
  const state0 = ctx.store.getState();
  const { report } = state0.simulationResult;
  const { items, indicators: ind, check } = ctx.derive(state0);

  const sc = createSpacecraftSvg({ t, vivid: true });
  sc.update(items);

  const score = createMetric({ label: t('screen.debrief.scientificScore'), icon: createIcon('science'), accent: 'metric--science' });
  score.set({
    value: report.totalScienceEarned,
    max: Math.max(report.targetSciencePoints, report.totalScienceEarned),
    text: `${num1(report.totalScienceEarned)} / ${report.targetSciencePoints} ${t('units.pts')}`,
    status: report.success ? 'ok' : 'bad',
    statusText: `${t('screen.debrief.weightedNote')} · ${report.success ? t('status.reached') : t('status.below')}`,
  });

  const tile = (label, value, tone = 'neutral') => h('div', { class: 'tile', 'data-tone': tone }, h('small', { text: label }), h('b', { text: value }));

  const goalRows = data.goals.map((g) => {
    const earned = report.scienceByGoal[g.id];
    const potential = ind.sciencePotentialByGoal[g.id];
    const ratio = potential > 0 ? Math.min(1, earned / potential) : 0;
    const isPriority = g.id === state0.goalPriorityId;
    return h('li', null,
      h('span', { class: 'goalbar__name', text: `${t(g.nameKey)}${isPriority ? ' ★' : ''}` }),
      h('span', { class: 'goalbar__track' }, h('span', { class: 'goalbar__fill', style: `width:${ratio * 100}%` })),
      h('b', { text: t('screen.debrief.goalLine', { earned: num1(earned) }) }));
  });

  const byKind = (kind) => report.insights.filter((i) => i.kind === kind);
  const list = (items2, tone) => h('ul', { class: `insights insights--${tone}` }, items2.map((i) => h('li', null, h('span', { 'aria-hidden': 'true', text: tone === 'good' ? '✓ ' : tone === 'bad' ? '✕ ' : '' }), i.text)));

  const eventRows = report.events.map((e) => {
    const def = data.byId.events.get(e.eventId);
    return h('li', { 'data-kind': def.kind },
      h('b', { text: `${def.kind === 'negative' ? '▼' : '▲'} ${t(def.nameKey)}` }),
      h('span', { text: ` · ${String(e.startMonth).padStart(2, '0')}–${String(e.endMonth).padStart(2, '0')}` }),
      e.scienceImpact === undefined ? null : h('em', { text: ` · ${Math.abs(e.scienceImpact) < 0.05 ? t('screen.debrief.eventNoImpact') : t('screen.debrief.eventImpact', { value: (e.scienceImpact >= 0 ? '+' : '−') + num1(Math.abs(e.scienceImpact)) })}` }));
  });

  const warnItems = check.warnings;
  console.log("LOL")
  const el = h(
    'section',
    { class: `screen screen--debrief ${report.success ? 'is-success' : 'is-failure'}` },
    h('div', { class: 'debrief__visual' }, h('div', { class: 'sim__earth' }, createEarthLimbSvg({ vivid: true }).el), h('div', { class: 'sim__sat' }, sc.el)),
    h('div', { class: 'debrief__panel' },
      h('div', { class: 'debrief__top' },
        h('div', { class: 'debrief__verdict' },
          h('h2', { class: 'verdict-title', text: report.success ? t('screen.debrief.success') : t('screen.debrief.failure') }),
          h('p', { text: report.success ? t('screen.debrief.successText') : t('screen.debrief.failureText') })),
        h('div', { class: 'panel debrief__score' }, score.el)),
      h('div', { class: 'debrief__tiles' },
        tile(t('screen.debrief.budgetUsed'), `${moneyInt(Math.round(report.costM * 10) / 10)} / ${moneyInt(report.budgetM)} (${percent(report.costM / report.budgetM)})`),
        tile(t('screen.debrief.operatingTime'), percent(report.averageOperatingFraction)),
        tile(t('screen.debrief.dataTransmitted'), gb(report.dataTransmittedGb)),
        tile(t('screen.debrief.dataLost'), gb(report.dataLostGb), report.dataLostGb > 0.5 ? 'bad' : 'ok'),
        tile(t('screen.debrief.dataUnsent'), gb(report.dataUnsentGb), report.dataUnsentGb > 0.5 ? 'warn' : 'ok')),
      h('div', { class: 'debrief__grid' },
        h('div', { class: 'panel' }, h('h3', { class: 'panel__heading', text: t('screen.debrief.goalsTitle') }), h('ul', { class: 'goalbars' }, goalRows),
          h('h3', { class: 'panel__heading', text: t('screen.debrief.eventsTitle') }),
          report.events.length ? h('ul', { class: 'event-list' }, eventRows) : h('p', { class: 'muted', text: t('screen.debrief.noEvents') }),
          h('h3', { class: 'panel__heading', text: t('screen.debrief.warningsTitle') }),
          warnItems.length ? h('ul', { class: 'event-list' }, warnItems.map((w) => h('li', null, w.message))) : h('p', { class: 'muted', text: t('screen.debrief.noWarnings') })),
        h('div', { class: 'panel' }, h('h3', { class: 'panel__heading', text: t('screen.debrief.decisions') }),
          byKind('helped').length ? h('div', { class: 'insight-box insight-box--good' }, h('h4', { text: t('screen.debrief.helped') }), list(byKind('helped'), 'good')) : null,
          byKind('hurt').length ? h('div', { class: 'insight-box insight-box--bad' }, h('h4', { text: t('screen.debrief.hurt') }), list(byKind('hurt'), 'bad')) : null,
          byKind('info').length ? h('div', { class: 'insight-box' }, h('h4', { text: t('screen.debrief.info') }), h('div', {class: "insight-box--flex"}, createIcon('info'), list(byKind('info'), 'info'))) : null)),
      h('div', { class: 'debrief__actions' },
        h('button', { type: 'button', class: 'btn btn--primary', onClick: act.tryAgain, text: t('screen.debrief.tryAgain') }),
        h('button', { type: 'button', class: 'btn', onClick: act.newMission, text: t('screen.debrief.newMission') }),
        h('button', { type: 'button', class: 'btn btn--transparent', onClick: act.toMenu, text: t('screen.debrief.mainMenu') }),
        h('small', { class: 'seed', text: t('screen.debrief.seed', { seed: report.seed }) }))),
  );
  void num;

  return { el, update() {} };
}
