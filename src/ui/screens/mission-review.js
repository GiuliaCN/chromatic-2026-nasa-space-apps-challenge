import { h, clear } from '../dom.js';
import { createSpacecraftSvg } from '../components/spacecraft-svg.js';
import { createMetric } from '../components/metric.js';
import { createIcon } from '../icons.js';
import { kg, money, moneyInt, pts } from '../format.js';
import { limitStatus, targetStatus } from '../status.js';

// Which validation codes feed each checklist row. Labels live in content.en.json.
const CHECKLIST = [
  { id: 'choices', blockers: ['missingPriority', 'missingOrbit', 'noPayload', 'missingBus', 'missingPower', 'missingComm', 'missingLauncher'], warnings: [] },
  { id: 'budget', blockers: ['budgetExceeded'], warnings: [] },
  { id: 'mass', blockers: ['launcherTooSmall', 'busOverloaded'], warnings: [] },
  { id: 'orbit', blockers: ['orbitIncompatible'], warnings: [] },
  { id: 'power', blockers: ['powerDeficit'], warnings: ['lowPowerMargin', 'batteryShort'] },
  { id: 'data', blockers: [], warnings: ['downlinkShort', 'overflowRisk'] },
  { id: 'science', blockers: [], warnings: ['scienceBelowTarget'] },
  { id: 'reliability', blockers: [], warnings: ['lowReliability'] },
];

const STATE_LABEL = { ok: 'screen.review.ok', warning: 'screen.review.warning', blocked: 'screen.review.blocked' };
const STATE_GLYPH = { ok: '✓', warning: '!', blocked: '✕' };

export function mountMissionReview(ctx) {
  const { t, data, act } = ctx;
  const sc = createSpacecraftSvg({ t });

  const budget = createMetric({ label: t('screen.review.budgetRemaining'), icon: createIcon('cost') });
  const forecast = createMetric({ label: t('screen.review.forecast'), icon: createIcon('science'), accent: 'metric--science' });
  const summaryHost = h('dl', { class: 'summary' });
  const checkHost = h('ul', { class: 'checklist' });
  const verdict = h('p', { class: 'verdict', role: 'status' });
  const approve = h('button', { type: 'button', class: 'btn btn--primary btn--launch', onClick: act.approve, text: t('screen.review.approve') });

  const methodSources = data.sources.filter((s) => s.type === 'methodology' && s.url);
  const methodology = methodSources.length
    ? h('section', { class: 'method', 'aria-labelledby': 'method-title' },
      h('h3', { class: 'method__title', id: 'method-title', text: t('screen.review.methodologyTitle') }),
      h('p', { class: 'method__text', text: t('screen.review.methodologyBody') }),
      h('ul', { class: 'method__links' }, methodSources.map((s) => h('li', null,
        h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${s.organization} — ${s.title} (${t('screen.review.opensNewTab')})`, text: `${s.organization} — ${s.title}` })))))
    : null;

  const el = h(
    'section',
    { class: 'screen screen--review' },
    h('article', { class: 'panel panel--stage' }, h('div', { class: 'stage stage--tall' }, sc.el),
      budget.el, forecast.el),
    h('article', { class: 'panel' },
      h('h2', { class: 'panel__title', text: t('screen.review.yourDesign') }),
      summaryHost),
    h('article', { class: 'panel' },
      h('h2', { class: 'panel__title', text: t('screen.review.checklist') }),
      checkHost, verdict, approve, methodology),
  );

  function row(label, value, step) {
    return [
      h('dt', { text: label }),
      h('dd', null, h('span', { text: value }), h('button', { type: 'button', class: 'btn btn--link', onClick: () => act.goto(step), 'aria-label': `${t('nav.edit')}: ${label}`, text: t('nav.edit') })),
    ];
  }

  return {
    el,
    update(state, { check, indicators: ind, items }) {
      sc.update(items);
      budget.set({ value: Math.max(0, ind.budgetRemainingM), max: ind.budgetM, text: `${moneyInt(Math.round(ind.budgetRemainingM * 10) / 10)} / ${moneyInt(ind.budgetM)}`, ...limitStatus(t, ind.totalCostM, ind.budgetM) });
      forecast.set({ value: ind.sciencePotentialTotal, max: data.game.targetSciencePoints, text: `${pts(ind.sciencePotentialTotal)} / ${data.game.targetSciencePoints}`, ...targetStatus(t, ind.sciencePotentialTotal, data.game.targetSciencePoints) });

      const name = (item) => (item ? t(item.nameKey) : '—');
      clear(summaryHost).append(
        ...row(t('screen.review.priority'), items.goal ? t(items.goal.priorityNameKey) : '—', 'briefing'),
        ...row(t('steps.orbit'), name(items.orbit), 'orbit'),
        ...row(t('steps.payload'), items.payloads.length ? items.payloads.map(name).join(', ') : '—', 'payload'),
        ...row(t('screen.spacecraft.tabPower'), name(items.power), 'spacecraft'),
        ...row(t('screen.spacecraft.tabComm'), name(items.comm), 'spacecraft'),
        ...row(t('screen.spacecraft.tabBus'), name(items.bus), 'spacecraft'),
        ...row(t('screen.review.launcher'), name(items.launcher), 'launch'),
        h('dt', { text: t('screen.payload.mass') }), h('dd', { text: kg(ind.totalMassKg) }),
        h('dt', { text: t('screen.payload.cost') }), h('dd', { text: money(ind.totalCostM) }),
      );

      clear(checkHost);
      for (const item of CHECKLIST) {
        const blockers = check.blockers.filter((b) => item.blockers.includes(b.code));
        const warns = check.warnings.filter((w) => item.warnings.includes(w.code));
        const status = blockers.length ? 'blocked' : warns.length ? 'warning' : 'ok';
        const issues = [...blockers, ...warns];
        checkHost.append(
          h('li', { class: `check check--${status}` },
            h('span', { class: 'check__glyph', 'aria-hidden': 'true', text: STATE_GLYPH[status] }),
            h('div', { class: 'check__body' },
              h('div', { class: 'check__head' }, h('b', { text: t(`screen.review.check.${item.id}`) }), h('span', { class: 'check__state', text: t(STATE_LABEL[status]) })),
              ...issues.map((i) => h('p', { class: 'check__msg' }, i.message, ' ', h('em', { text: i.action }), ' ', h('button', { type: 'button', class: 'btn btn--link', onClick: () => act.goto(i.step), text: `${t('screen.review.fixHint')} › ${t(`steps.${i.step}`)}` }))))),
        );
      }

      approve.disabled = !check.canLaunch;
      verdict.textContent = check.canLaunch ? (check.warnings.length ? t('screen.review.warningsNote') : t('screen.review.allClear')) : t('screen.review.approveBlocked');
      verdict.dataset.tone = check.canLaunch ? (check.warnings.length ? 'warn' : 'ok') : 'bad';
    },
  };
}
