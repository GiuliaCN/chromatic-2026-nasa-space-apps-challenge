// Replays the precomputed, deterministic timeline. Timers only drive the visuals: the numbers
// come entirely from state.simulationResult (computed by core/simulation.js at launch).

import { h, clear } from '../dom.js';
import { createSpacecraftSvg } from '../components/spacecraft-svg.js';
import { createEarthLimbSvg } from '../components/earth-svg.js';
import { createMetric } from '../components/metric.js';
import { createIcon } from '../icons.js';
import { gb, num, num1, percent, signed } from '../format.js';

const SPEEDS = [1, 5, 10];
const BASE_MS = 1000;

export function mountMissionSimulation(ctx) {
  const { t, data, act } = ctx;
  const state0 = ctx.store.getState();
  const result = state0.simulationResult;
  const derived = ctx.derive(state0);
  const { indicators: ind, items } = derived;
  const D = data.game.durationMonths;
  const target = data.game.targetSciencePoints;

  const sc = createSpacecraftSvg({ t, vivid: true });
  sc.update(items);
  const earth = createEarthLimbSvg({ vivid: true });

  let month = 0;
  let playing = true;
  let speed = 1;
  let timer = null;

  const monthEl = h('div', { class: 'sim__month', 'aria-live': 'off' });
  const monthBar = h('span', { class: 'sim__monthbar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': D, 'aria-label': t('screen.simulation.timeline') }, h('span'));
  const playBtn = h('button', { type: 'button', class: 'btn btn--icon', onClick: () => setPlaying(!playing) });
  const speedBtns = SPEEDS.map((v) => h('button', { type: 'button', class: 'btn btn--seg', 'aria-pressed': 'false', 'aria-label': `${t('screen.simulation.speed')} ${v}×`, onClick: () => setSpeed(v), text: `${v}×` }));
  const skipBtn = h('button', { type: 'button', class: 'btn', onClick: () => act.finishSimulation(), text: t('screen.simulation.skipToResults') });
  const resultsBtn = h('button', { type: 'button', class: 'btn btn--primary', onClick: () => act.finishSimulation(), text: t('screen.simulation.seeResults') });
  resultsBtn.hidden = true;

  const powerM = createMetric({ label: t('screen.simulation.power'), icon: createIcon('power') });
  const dataM = createMetric({ label: t('screen.simulation.dataTransmitted'), icon: createIcon('data') });
  const scienceM = createMetric({ label: t('screen.simulation.science'), icon: createIcon('science'), accent: 'metric--science' });
  const bufferM = createMetric({ label: t('screen.simulation.dataBuffered'), icon: createIcon('signal') });
  const lostEl = h('p', { class: 'sim__lost' });
  const noteEl = h('p', { class: 'sim__note' });
  const banner = h('div', { class: 'sim__banner', role: 'status' });
  const instrHost = h('ul', { class: 'instr' });
  const goalHost = h('ul', { class: 'goalbars' });
  const eventsBody = h('tbody');
  const emptyEvents = h('p', { class: 'muted', text: t('screen.simulation.noEvents') });

  const goalRows = data.goals.map((g) => {
    const fill = h('span', { class: 'goalbar__fill' });
    const val = h('b');
    const li = h('li', null, h('span', { class: 'goalbar__name', text: t(g.nameKey) }), h('span', { class: 'goalbar__track' }, fill), val);
    goalHost.append(li);
    return { g, fill, val };
  });

  const el = h(
    'section',
    { class: 'screen screen--simulation' },
    h('div', { class: 'sim__visual' }, h('div', { class: 'sim__earth' }, earth.el), h('div', { class: 'sim__sat' }, sc.el), banner),
    h('div', { class: 'sim__panel' },
      h('div', { class: 'sim__timeline panel' }, h('div', null, h('small', { text: t('screen.simulation.timeline') }), monthEl, monthBar), h('div', { class: 'sim__controls' }, playBtn, h('div', { class: 'seg', role: 'group', 'aria-label': t('screen.simulation.speed') }, speedBtns), skipBtn, resultsBtn)),
      h('div', { class: 'sim__tiles' }, powerM.el, dataM.el, scienceM.el, bufferM.el),
      h('div', { class: 'sim__mid' },
        h('div', { class: 'panel' }, h('h2', { class: 'panel__heading', text: t('screen.simulation.instruments') }), instrHost),
        h('div', { class: 'panel' }, h('h2', { class: 'panel__heading', text: t('screen.simulation.goals') }), goalHost)),
      h('div', { class: 'panel sim__events' },
        h('h2', { class: 'panel__heading', text: t('screen.simulation.events') }),
        h('div', { class: 'table-wrap' }, h('table', { class: 'events-table' },
          h('thead', null, h('tr', null, h('th', { text: t('screen.simulation.eventMonth') }), h('th', { text: t('screen.simulation.eventName') }), h('th', { text: t('screen.simulation.eventEffect') }))), eventsBody)),
        emptyEvents, noteEl, lostEl)),
  );

  function effectText(def) {
    return def.effects.map((fx) => t(`screen.simulation.effect.${fx.type}`, { value: fx.value.toFixed(2) })).join(', ');
  }

  function render() {
    monthEl.textContent = t('screen.simulation.month', { month: String(month).padStart(2, '0'), total: D });
    monthBar.firstChild.style.width = `${(month / D) * 100}%`;
    monthBar.setAttribute('aria-valuenow', String(month));
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? t('screen.simulation.pause') : t('screen.simulation.play'));
    playBtn.hidden = month >= D;
    speedBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(SPEEDS[i] === speed)));
    skipBtn.hidden = month >= D;
    resultsBtn.hidden = month < D;

    const rec = month > 0 ? result.timeline[month - 1] : null;
    const upto = result.timeline.slice(0, month);
    const transmitted = upto.reduce((a, m) => a + m.dataTransmittedGb, 0);
    const lost = upto.reduce((a, m) => a + m.dataLostGb, 0);
    const science = rec ? rec.cumulativeScience : 0;
    const ratio = ind.totalPowerDemandW > 0 && rec ? rec.powerMarginW / ind.totalPowerDemandW : 0;
    powerM.set({ value: rec ? Math.max(0, rec.effectiveGenerationW) : 0, max: ind.generationW, text: rec ? `${signed(rec.powerMarginW, ' W')} (${signed(ratio * 100, '%')})` : '—', status: rec && rec.powerMarginW < 0 ? 'bad' : 'ok', statusText: rec && rec.powerMarginW < 0 ? t('status.deficit') : '' });
    dataM.set({ text: gb(transmitted) });
    scienceM.set({ value: science, max: target, text: `${num1(science)} / ${target}`, status: science >= target ? 'ok' : 'neutral', statusText: science >= target ? t('status.reached') : '' });
    bufferM.set({ value: rec ? rec.bufferGb : 0, max: ind.storageGb, text: `${gb(rec ? rec.bufferGb : 0)} / ${gb(ind.storageGb)}`, status: rec && rec.bufferGb > ind.storageGb * 0.8 ? 'warn' : 'ok', statusText: rec && rec.bufferGb > ind.storageGb * 0.8 ? t('status.near') : '' });
    lostEl.textContent = `${t('screen.simulation.dataLost')}: ${gb(lost)}`;
    lostEl.dataset.tone = lost > 0 ? 'bad' : 'ok';
    noteEl.textContent = rec ? rec.notes.map((n) => n.text).join(' ') : '';

    // Instrument status derives from the month's operating fraction.
    clear(instrHost);
    const frac = rec ? rec.operatingFraction : 1;
    const label = frac >= 0.95 ? 'operational' : frac >= 0.5 ? 'degraded' : 'offline';
    for (const p of items.payloads) {
      instrHost.append(h('li', { 'data-status': label }, h('span', { text: t(p.nameKey) }), h('b', { text: `${t(`screen.simulation.${label}`)} · ${percent(frac)}` })));
    }

    for (const { g, fill, val } of goalRows) {
      const earned = rec ? rec.cumulativeByGoal[g.id] : 0;
      const potential = ind.sciencePotentialByGoal[g.id];
      fill.style.width = `${potential > 0 ? Math.min(100, (earned / potential) * 100) : 0}%`;
      val.textContent = `${num1(earned)} ${t('units.pts')}`;
    }

    clear(eventsBody);
    const seen = result.report.events.filter((e) => e.startMonth <= month);
    emptyEvents.hidden = seen.length > 0;
    for (const e of seen) {
      const def = data.byId.events.get(e.eventId);
      eventsBody.append(h('tr', { 'data-kind': def.kind }, h('td', { text: String(e.startMonth).padStart(2, '0') }), h('td', null, h('b', { text: `${def.kind === 'negative' ? '▼' : '▲'} ` }), t(def.nameKey)), h('td', { text: effectText(def) })));
    }

    // Flash a banner in the month a new event begins.
    if (rec && rec.newEventId) {
      const def = data.byId.events.get(rec.newEventId);
      banner.replaceChildren(h('b', { text: `${def.kind === 'negative' ? '▼' : '▲'} ${t(def.nameKey)}` }), h('span', { text: t(def.descriptionKey) }));
      banner.dataset.kind = def.kind;
      banner.classList.remove('is-on');
      void banner.offsetWidth; // restart the CSS animation
      banner.classList.add('is-on');
    } else if (!rec || !rec.newEventId) {
      banner.classList.remove('is-on');
    }

    // Visual feedback for active events.
    const active = (rec ? rec.activeEventIds : []).map((id) => data.byId.events.get(id));
    const has = (type, pred) => active.some((ev) => ev.effects.some((fx) => fx.type === type && pred(fx.value)));
    sc.setEffects({
      panelDim: has('powerGenerationMultiplier', (v) => v < 1),
      instrumentFault: has('instrumentAvailabilityMultiplier', (v) => v < 1),
      linkLost: has('downlinkMultiplier', (v) => v < 1),
      boosted: has('scienceOpportunityMultiplier', (v) => v > 1) || has('downlinkMultiplier', (v) => v > 1),
    });
    void num;
  }

  function tick() {
    clearTimeout(timer);
    if (!playing || month >= D) return;
    timer = setTimeout(() => {
      month += 1;
      if (month >= D) playing = false;
      render();
      tick();
    }, BASE_MS / speed);
  }
  function setPlaying(v) {
    playing = v;
    render();
    tick();
  }
  function setSpeed(v) {
    speed = v;
    if (!playing && month < D) playing = true;
    render();
    tick();
  }

  render();
  tick();
  playBtn.focus({ preventScroll: true });

  return { el, update() {}, destroy: () => clearTimeout(timer) };
}
