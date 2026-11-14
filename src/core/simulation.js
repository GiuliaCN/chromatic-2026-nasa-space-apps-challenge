// Deterministic month-by-month mission simulation (escopo-mvp.md section 5.5).
// Input: data bundle + a launch-valid selection + seed. Output: timeline + explanatory report.
// No DOM, no storage, no timers. The UI only replays the returned timeline.

import { computeIndicators, resolveSelection } from './calculations.js';
import { makeTranslator } from './i18n.js';
import { createRng } from './rng.js';
import { validateDesign } from './validation.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (v) => Math.round(v * 10) / 10;

function conditionMet(cond, ctx) {
  switch (cond.type) {
    case 'powerMarginRatioBelow':
      return ctx.powerMarginRatio < cond.value;
    case 'downlinkMarginRatioBelow':
      return ctx.downlinkMarginRatio < cond.value;
    case 'hasInstrument':
      return ctx.payloadIds.includes(cond.value);
    case 'orbitIs':
      return ctx.orbitId === cond.value;
    case 'goalPriorityIs':
      return ctx.goalPriorityId === cond.value;
    default:
      return false; // unknown types are rejected by the config validator
  }
}

/** Product of every active (non-neutralised) effect of a given type. */
function multiplier(active, type) {
  let m = 1;
  for (const inst of active) {
    if (inst.neutralized) continue;
    for (const fx of inst.effects) if (fx.type === type) m *= fx.value;
  }
  return m;
}

/**
 * Core loop. `neutralized` is a Set of event-instance indexes whose effects are ignored
 * (the instance still occupies its slot, so the random draws and schedule stay identical).
 * That makes "what if this event had not happened" counterfactuals exact and cheap.
 */
function runCore(data, selection, seed, neutralized = new Set(), notes = null) {
  const { game } = data;
  const D = game.durationMonths;
  const ind = computeIndicators(data, selection);
  const { power, comm, bus, payloads, orbit, launcher } = resolveSelection(data, selection);
  const goalIds = data.goals.map((g) => g.id);

  const ctx = {
    powerMarginRatio: ind.powerMarginRatio,
    downlinkMarginRatio: ind.payloadDataGbPerMonth > 0 ? ind.downlinkMarginGbPerMonth / ind.payloadDataGbPerMonth : Infinity,
    payloadIds: payloads.map((p) => p.id),
    orbitId: orbit.id,
    goalPriorityId: selection.goalPriorityId,
  };
  const negativeBoost = 1 + (1 - ind.missionReliability) * game.reliabilitySensitivity;

  const rng = createRng(seed);
  const t = notes ? makeTranslator(data.content) : null;
  const zeroByGoal = () => Object.fromEntries(goalIds.map((g) => [g, 0]));

  const fixedDemandW = bus.powerW + comm.powerW;
  const batteryFactor = game.batteryAvailabilityFloor + (1 - game.batteryAvailabilityFloor) * ind.batteryCoverage;

  let active = [];
  const instances = [];
  let bufferGb = 0;
  let bufferScience = zeroByGoal();
  const earned = zeroByGoal();
  let dataGenerated = 0;
  let dataTransmitted = 0;
  let dataLost = 0;
  let scienceLost = 0;
  const timeline = [];

  for (let month = 1; month <= D; month += 1) {
    // 1. Events. Two draws are always consumed so seeds stay comparable across designs.
    active = active.filter((a) => a.endMonth >= month);
    const drawChance = rng.next();
    const drawPick = rng.next();
    let started = null;
    if (drawChance < game.eventChancePerMonth) {
      const eligible = data.events.filter(
        (ev) => !active.some((a) => a.eventId === ev.id) && (ev.conditions ?? []).every((c) => conditionMet(c, ctx)),
      );
      const weights = eligible.map((ev) => ev.weight * (ev.kind === 'negative' ? negativeBoost : 1));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      if (eligible.length > 0 && totalWeight > 0) {
        let roll = drawPick * totalWeight;
        let chosen = eligible[eligible.length - 1];
        for (let i = 0; i < eligible.length; i += 1) {
          roll -= weights[i];
          if (roll < 0) {
            chosen = eligible[i];
            break;
          }
        }
        started = {
          index: instances.length,
          eventId: chosen.id,
          kind: chosen.kind,
          startMonth: month,
          endMonth: month + chosen.durationMonths - 1,
          effects: chosen.effects,
          neutralized: neutralized.has(instances.length),
        };
        instances.push(started);
        active.push(started);
      }
    }

    // 2. Energy and operation.
    const genMult = multiplier(active, 'powerGenerationMultiplier');
    const availMult = multiplier(active, 'instrumentAvailabilityMultiplier');
    const downMult = multiplier(active, 'downlinkMultiplier');
    const oppMult = multiplier(active, 'scienceOpportunityMultiplier');
    const effectiveGenerationW = power.generationW * genMult;
    const payloadPowerW = ind.payloadPowerW;
    const powerFraction = payloadPowerW > 0 ? clamp((effectiveGenerationW - fixedDemandW) / payloadPowerW, 0, 1) : 1;
    const operatingFraction = clamp(powerFraction * availMult * batteryFactor, 0, 1);

    // 3. Production.
    const generated = ind.payloadDataGbPerMonth * operatingFraction;
    const observed = zeroByGoal();
    let observedTotal = 0;
    for (const g of goalIds) {
      observed[g] = (ind.sciencePotentialByGoal[g] / D) * operatingFraction * oppMult;
      observedTotal += observed[g];
      bufferScience[g] += observed[g];
    }
    bufferGb += generated;
    dataGenerated += generated;

    // 4. Transmission and science credit (only for data that reaches Earth this month).
    const capacity = comm.downlinkGbPerMonth * downMult;
    const transmitted = Math.min(bufferGb, capacity);
    const sentFraction = bufferGb > 0 ? transmitted / bufferGb : 0;
    const credited = zeroByGoal();
    let creditedTotal = 0;
    for (const g of goalIds) {
      credited[g] = bufferScience[g] * sentFraction;
      creditedTotal += credited[g];
      earned[g] += credited[g];
      bufferScience[g] -= credited[g];
    }
    bufferGb -= transmitted;
    dataTransmitted += transmitted;

    // 5. Overflow: whatever exceeds storage is lost together with the science it carried.
    let lost = 0;
    let lostScience = 0;
    if (bufferGb > bus.storageGb) {
      lost = bufferGb - bus.storageGb;
      const lostFraction = lost / bufferGb;
      for (const g of goalIds) {
        const part = bufferScience[g] * lostFraction;
        lostScience += part;
        bufferScience[g] -= part;
      }
      bufferGb = bus.storageGb;
    }
    dataLost += lost;
    scienceLost += lostScience;

    // 6. Record.
    const cumulative = goalIds.reduce((s, g) => s + earned[g], 0);
    let note = null;
    if (t) {
      const lines = [];
      if (started) lines.push({ code: 'eventStart', text: t('screen.simulation.note.eventStart', { name: t(data.byId.events.get(started.eventId).nameKey) }) });
      if (powerFraction < 0.995) lines.push({ code: 'lowPower', text: t('screen.simulation.note.lowPower', { percent: Math.round(powerFraction * 100) }) });
      if (ind.batteryCoverage < 1) lines.push({ code: 'batteryLimit', text: t('screen.simulation.note.batteryLimit') });
      if (lost > 0.05) lines.push({ code: 'overflow', text: t('screen.simulation.note.overflow', { gb: Math.round(lost) }) });
      else if (bufferGb > 0.5) lines.push({ code: 'backlog', text: t('screen.simulation.note.backlog', { gb: Math.round(bufferGb) }) });
      if (lines.length === 0) lines.push({ code: 'nominal', text: t('screen.simulation.note.nominal') });
      note = lines;
    }
    timeline.push({
      month,
      newEventId: started ? started.eventId : null,
      activeEventIds: active.map((a) => a.eventId),
      effectiveGenerationW,
      powerMarginW: effectiveGenerationW - ind.totalPowerDemandW,
      powerFraction,
      operatingFraction,
      dataGeneratedGb: generated,
      dataTransmittedGb: transmitted,
      dataLostGb: lost,
      bufferGb,
      scienceObserved: observedTotal,
      scienceCreditedByGoal: credited,
      scienceCredited: creditedTotal,
      scienceLost: lostScience,
      cumulativeScience: cumulative,
      cumulativeByGoal: { ...earned },
      notes: note,
    });
  }

  const unsentScience = goalIds.reduce((s, g) => s + bufferScience[g], 0);
  return {
    timeline,
    instances,
    scienceByGoal: earned,
    totalScience: goalIds.reduce((s, g) => s + earned[g], 0),
    dataGenerated,
    dataTransmitted,
    dataLost,
    dataUnsent: bufferGb,
    scienceLost,
    unsentScience,
    launcher,
    indicators: ind,
  };
}

function buildInsights(data, selection, core, base) {
  const t = makeTranslator(data.content);
  const { goal, orbit, bus, launcher } = resolveSelection(data, selection);
  const ind = core.indicators;
  const out = [];
  const add = (kind, code, params = {}, points = null) =>
    out.push({ kind, code, params, points, text: t(`insight.${code}`, params) });

  // Priority weighting.
  const weight = goal.priorityMultiplier;
  const priorityPts = core.scienceByGoal[goal.id] * (1 - 1 / weight);
  if (priorityPts >= 0.5) add('helped', 'priority', { goal: t(goal.nameKey), points: r1(priorityPts) }, priorityPts);

  // Orbit versus the priority goal.
  const obs = orbit.observationMultiplierByGoal[goal.id];
  if (obs > 1) add('helped', 'orbitHelped', { orbit: t(orbit.nameKey), goal: t(goal.nameKey), value: obs.toFixed(2) });
  else if (obs < 1) add('hurt', 'orbitHurt', { orbit: t(orbit.nameKey), goal: t(goal.nameKey), value: obs.toFixed(2) });

  // Data pipeline.
  if (core.dataLost > 0.5) {
    add('hurt', 'dataLost', { gb: Math.round(core.dataLost), points: r1(core.scienceLost) }, -core.scienceLost);
  }
  if (core.dataUnsent > 0.5 && core.unsentScience >= 0.1) {
    add('hurt', 'dataUnsent', { gb: Math.round(core.dataUnsent), points: r1(core.unsentScience) }, -core.unsentScience);
  }
  const backlogMonths = core.timeline.filter((m) => m.bufferGb > 0.5).length;
  if (backlogMonths >= 2 && core.dataLost <= 0.5) add('hurt', 'backlogMonths', { months: backlogMonths });
  if (core.dataLost <= 0.5 && core.dataUnsent <= 0.5) add('helped', 'dataClean');

  // Power and battery.
  const D = data.game.durationMonths;
  const powerMonths = core.timeline.filter((m) => m.powerFraction < 0.995);
  if (powerMonths.length > 0) {
    const pts = powerMonths.reduce((s, m) => s + (ind.sciencePotentialTotal / D) * (1 - m.powerFraction), 0);
    add('hurt', 'powerLimited', { months: powerMonths.length, points: r1(pts) }, -pts);
  } else {
    add('helped', 'powerClean');
  }
  if (ind.eclipseEnergyNeedWh > 0) {
    if (ind.batteryCoverage < 1) add('hurt', 'batteryShort', { percent: Math.round(ind.batteryCoverage * 100) });
    else add('helped', 'batteryOk');
  }

  // Events: exact counterfactual impact of each instance.
  const events = core.instances.map((inst) => {
    const without = runCore(data, selection, base.seed, new Set([inst.index]));
    return { inst, impact: core.totalScience - without.totalScience };
  });
  const shown = events
    .filter((e) => Math.abs(e.impact) >= 0.5)
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 3);
  for (const { inst, impact } of shown) {
    const name = t(data.byId.events.get(inst.eventId).nameKey);
    const months = Math.min(inst.endMonth, D) - inst.startMonth + 1;
    if (impact < 0) add('hurt', 'eventNegative', { event: name, months, points: r1(-impact) }, impact);
    else add('helped', 'eventPositive', { event: name, months, points: r1(impact) }, impact);
  }
  if (core.instances.length === 0) add('info', 'eventNone');

  if (ind.missionReliability < data.game.lowReliabilityThreshold) {
    add('hurt', 'reliabilityRisk', { percent: Math.round(ind.missionReliability * 100) });
  }
  add('info', 'budget', { used: Math.round(ind.totalCostM), budget: data.game.budgetM });

  return { insights: out, eventImpacts: events };
}

/**
 * Simulate the full mission. Throws if the design has launch blockers (the UI never calls this
 * for a blocked design). `explain: false` skips insights and counterfactuals (used by calibration).
 */
export function simulateMission(data, selection, seed, { explain = true } = {}) {
  const check = validateDesign(data, selection);
  if (!check.canLaunch) throw new Error('Cannot simulate a design that has launch blockers.');

  const core = runCore(data, selection, seed, new Set(), explain ? [] : null);
  const D = data.game.durationMonths;
  const total = core.totalScience;
  const report = {
    seed,
    success: total >= data.game.targetSciencePoints,
    targetSciencePoints: data.game.targetSciencePoints,
    totalScienceEarned: total,
    scienceByGoal: core.scienceByGoal,
    dataGeneratedGb: core.dataGenerated,
    dataTransmittedGb: core.dataTransmitted,
    dataLostGb: core.dataLost,
    dataUnsentGb: core.dataUnsent,
    scienceLost: core.scienceLost,
    scienceUnsent: core.unsentScience,
    costM: core.indicators.totalCostM,
    budgetM: data.game.budgetM,
    averageOperatingFraction: core.timeline.reduce((s, m) => s + m.operatingFraction, 0) / D,
    events: core.instances.map((i) => ({
      eventId: i.eventId,
      kind: i.kind,
      startMonth: i.startMonth,
      endMonth: Math.min(i.endMonth, D),
    })),
    warningsAtLaunch: check.warnings.map((w) => w.code),
    insights: [],
  };
  if (explain) {
    const { insights, eventImpacts } = buildInsights(data, selection, core, { seed });
    report.insights = insights;
    report.events = report.events.map((e, i) => ({ ...e, scienceImpact: eventImpacts[i].impact }));
  }
  return { seed, timeline: core.timeline, report };
}
