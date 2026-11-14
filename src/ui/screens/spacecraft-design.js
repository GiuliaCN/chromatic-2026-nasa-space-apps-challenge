import { h, clear } from '../dom.js';
import { createChoiceCard } from '../components/choice-card.js';
import { createMetric } from '../components/metric.js';
import { createSpacecraftSvg } from '../components/spacecraft-svg.js';
import { computeIndicators } from '../../core/calculations.js';
import { createIcon } from '../icons.js';
import { gb, gbMonth, kg, money, moneyInt, percent, signed, watts, wh } from '../format.js';

const TABS = ['power', 'comm', 'bus'];

export function mountSpacecraftDesign(ctx) {
  const { t, data, act } = ctx;
  const sc = createSpacecraftSvg({ t });
  let tab = 'power';
  let shownTab = null;
  let lastState = null;
  let lastDerived = null;

  const TAB_CONFIG = {
    power: {
      title: 'screen.spacecraft.powerTitle',
      tip: 'screen.spacecraft.tipPower',
      list: data.powers,
      select: act.selectPower,
      stateKey: 'powerId',
      selKey: 'powerId',
      stats: (o) => [
        { label: t('screen.spacecraft.generation'), value: watts(o.generationW) },
        { label: t('screen.spacecraft.battery'), value: wh(o.batteryWh) },
        { label: t('screen.spacecraft.mass'), value: kg(o.massKg) },
        { label: t('screen.spacecraft.cost'), value: money(o.costM) },
        { label: t('screen.spacecraft.margin'), value: '—' },
      ],
      preview: (ind) => signed(ind.powerMarginW, ` ${t('units.w')}`),
    },
    comm: {
      title: 'screen.spacecraft.commTitle',
      tip: 'screen.spacecraft.tipComm',
      list: data.comms,
      select: act.selectComm,
      stateKey: 'communicationId',
      selKey: 'communicationId',
      stats: (o) => [
        { label: t('screen.spacecraft.downlink'), value: gbMonth(o.downlinkGbPerMonth) },
        { label: t('screen.spacecraft.power'), value: watts(o.powerW) },
        { label: t('screen.spacecraft.mass'), value: kg(o.massKg) },
        { label: t('screen.spacecraft.cost'), value: money(o.costM) },
        { label: t('screen.spacecraft.downlinkMargin'), value: '—' },
      ],
      preview: (ind) => `${signed(ind.downlinkMarginGbPerMonth)} ${t('units.gbPerMonth')}`,
    },
    bus: {
      title: 'screen.spacecraft.busTitle',
      tip: 'screen.spacecraft.tipBus',
      list: data.buses,
      select: act.selectBus,
      stateKey: 'busId',
      selKey: 'busId',
      stats: (o) => [
        { label: t('screen.spacecraft.capacity'), value: kg(o.maxSupportedMassKg) },
        { label: t('screen.spacecraft.storage'), value: gb(o.storageGb) },
        { label: t('screen.spacecraft.reliability'), value: percent(o.reliability) },
        { label: t('screen.spacecraft.mass'), value: kg(o.massKg) },
        { label: t('screen.spacecraft.cost'), value: money(o.costM) },
        { label: t('screen.spacecraft.loadVsCapacity'), value: '—' },
      ],
      preview: (ind, o) => `${kg(ind.supportedLoadKg)} / ${kg(o.maxSupportedMassKg)}`,
    },
  };

  // Cards for every tab are built once and shown/hidden, so selection feedback stays instant.
  const panels = {};
  for (const key of TABS) {
    const cfg = TAB_CONFIG[key];
    const cards = new Map();
    const list = h('div', { class: 'choice-list', role: 'radiogroup', 'aria-label': t(cfg.title) });
    for (const option of cfg.list) {
      const card = createChoiceCard({
        title: t(option.nameKey),
        description: t(option.descriptionKey),
        stats: cfg.stats(option),
        onSelect: () => cfg.select(option.id),
      });
      cards.set(option.id, card);
      list.append(card.el);
    }
    panels[key] = { cards, list };
  }

  const metricSet = {
    power: [
      createMetric({ label: t('screen.spacecraft.margin'), icon: createIcon('power') }),
      createMetric({ label: t('screen.spacecraft.batteryCoverage'), icon: createIcon('battery') }),
    ],
    comm: [
      createMetric({ label: t('screen.spacecraft.downlinkMargin'), icon: createIcon('signal') }),
      createMetric({ label: t('screen.spacecraft.bufferRisk'), icon: createIcon('data') }),
    ],
    bus: [
      createMetric({ label: t('screen.spacecraft.loadVsCapacity'), icon: createIcon('mass') }),
      createMetric({ label: t('screen.spacecraft.reliability'), icon: createIcon('science') }),
    ],
  };
  const metricHost = h('div', { class: 'metric-host' });
  const noticeHost = h('ul', { class: 'notices', 'aria-live': 'polite' });
  const tipEl = h('p', { class: 'tip' });
  const totalsEl = h('p', { class: 'fine' });
  const optionsHost = h('div', { class: 'options-host' });
  const headingEl = h('h2', { class: 'panel__title' });

  const tabButtons = TABS.map((key) => {
    const label = { power: 'screen.spacecraft.tabPower', comm: 'screen.spacecraft.tabComm', bus: 'screen.spacecraft.tabBus' }[key];
    const btn = h('button', { type: 'button', role: 'tab', class: 'tab', id: `tab-${key}`, 'aria-controls': 'tab-panel', onClick: () => { tab = key; if (lastState) render(lastState, lastDerived); } }, t(label));
    btn.addEventListener('keydown', (e) => {
      const i = TABS.indexOf(key);
      const j = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : -1;
      if (j >= 0) {
        e.preventDefault();
        tab = TABS[j];
        render(lastState, lastDerived);
        tabButtons[j].focus();
      }
    });
    return btn;
  });

  const el = h(
    'section',
    { class: 'screen screen--spacecraft' },
    h('article', { class: 'panel' },
      h('h2', { class: 'panel__title', text: t('screen.spacecraft.summaryTitle') }),
      metricHost, noticeHost, tipEl, totalsEl),
    h('article', { class: 'panel panel--stage' }, h('div', { class: 'stage stage--tall' }, sc.el)),
    h('article', { class: 'panel' },
      h('div', { class: 'tabs', role: 'tablist', 'aria-label': t('screen.spacecraft.title') }, tabButtons),
      headingEl,
      h('div', { id: 'tab-panel', role: 'tabpanel' }, optionsHost)),
  );

  function render(state, derived) {
    lastState = state;
    lastDerived = derived;
    const { check, indicators: ind, items, selection } = derived;
    const cfg = TAB_CONFIG[tab];
    sc.update(items);

    tabButtons.forEach((b, i) => {
      b.setAttribute('aria-selected', String(TABS[i] === tab));
      b.tabIndex = TABS[i] === tab ? 0 : -1;
      b.classList.toggle('is-active', TABS[i] === tab);
    });
    headingEl.textContent = t(cfg.title);
    tipEl.replaceChildren(h('b', { text: `${t('screen.spacecraft.tipLabel')} ` }), t(cfg.tip));

    // Options for the active tab, with a live preview of what picking each one would do.
    if (shownTab !== tab) {
      clear(optionsHost).append(panels[tab].list);
      shownTab = tab;
    }
    for (const [id, card] of panels[tab].cards) {
      const option = data.byId[{ power: 'powers', comm: 'comms', bus: 'buses' }[tab]].get(id);
      const hypo = computeIndicators(data, { ...selection, [cfg.selKey]: id });
      card.set({ selected: state[cfg.stateKey] === id, values: cfg.stats(option).map((s, i, arr) => (i === arr.length - 1 ? cfg.preview(hypo, option) : undefined)) });
    }

    // Left panel: only the indicators tied to this tab.
    const [m1, m2] = metricSet[tab];
    if (metricHost.firstChild !== m1.el) clear(metricHost).append(m1.el, m2.el);
    if (tab === 'power') {
      const bad = ind.powerMarginW < 0;
      const thin = !bad && ind.powerMarginRatio < data.game.lowPowerMarginRatio;
      m1.set({ value: ind.totalPowerDemandW, max: Math.max(ind.generationW, ind.totalPowerDemandW), text: `${watts(ind.totalPowerDemandW)} / ${watts(ind.generationW)} (${signed(ind.powerMarginW, ' W')})`, status: !items.power ? 'neutral' : bad ? 'bad' : thin ? 'warn' : 'ok', statusText: !items.power ? '' : bad ? t('status.deficit') : thin ? t('status.thin') : t('status.ok') });
      m2.set({ value: ind.batteryCoverage, max: 1, text: `${percent(ind.batteryCoverage)} · ${wh(ind.batteryWh)} / ${wh(ind.eclipseEnergyNeedWh)}`, status: !items.power || !items.orbit ? 'neutral' : ind.batteryCoverage >= 1 ? 'ok' : 'warn', statusText: ind.batteryCoverage >= 1 ? t('status.covered') : t('status.partial') });
    } else if (tab === 'comm') {
      const short = ind.downlinkMarginGbPerMonth < 0;
      m1.set({ value: ind.payloadDataGbPerMonth, max: Math.max(ind.downlinkGbPerMonth, ind.payloadDataGbPerMonth), text: `${gbMonth(ind.payloadDataGbPerMonth)} / ${gbMonth(ind.downlinkGbPerMonth)}`, status: !items.comm ? 'neutral' : short ? 'warn' : 'ok', statusText: !items.comm ? '' : short ? t('status.short') : t('status.enough') });
      m2.set({ value: ind.projectedBacklogGb, max: Math.max(ind.storageGb, ind.projectedBacklogGb), text: `${gb(ind.projectedBacklogGb)} / ${gb(ind.storageGb)}`, status: ind.projectedBacklogGb > ind.storageGb ? 'warn' : 'ok', statusText: ind.projectedBacklogGb > ind.storageGb ? t('status.overflowRisk') : t('status.ok') });
    } else {
      const bad = ind.supportedLoadKg > (items.bus?.maxSupportedMassKg ?? 0);
      m1.set({ value: ind.supportedLoadKg, max: Math.max(items.bus?.maxSupportedMassKg ?? 0, ind.supportedLoadKg), text: `${kg(ind.supportedLoadKg)} / ${kg(items.bus?.maxSupportedMassKg ?? 0)}`, status: !items.bus ? 'neutral' : bad ? 'bad' : 'ok', statusText: !items.bus ? '' : bad ? t('status.over') : t('status.ok') });
      const rel = items.bus?.reliability ?? 0;
      const lowRel = Boolean(items.bus) && rel < data.game.lowReliabilityThreshold;
      m2.set({ value: rel, max: 1, text: items.bus ? percent(rel) : '—', status: !items.bus ? 'neutral' : lowRel ? 'warn' : 'ok', statusText: !items.bus ? '' : lowRel ? t('status.lowReliability') : t('status.ok') });
    }

    clear(noticeHost);
    for (const item of [...check.blockers, ...check.warnings].filter((i) => i.step === 'spacecraft' && i.tab === tab)) {
      noticeHost.append(h('li', { class: `notice notice--${item.severity}` }, h('b', { text: `${t(item.severity === 'blocker' ? 'screen.review.blocked' : 'screen.review.warning')}: ` }), item.message, ' ', h('em', { text: item.action })));
    }
    totalsEl.textContent = `${t('screen.payload.mass')}: ${kg(ind.totalMassKg)} · ${t('screen.payload.cost')}: ${money(ind.totalCostM)} · ${t('screen.review.budgetRemaining')}: ${moneyInt(Math.round(ind.budgetRemainingM * 10) / 10)}`;
  }

  return { el, update: render };
}
