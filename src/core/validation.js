// Launch checklist (escopo-mvp.md section 5.4): hard blockers vs. soft warnings.
// Returns structured items with localized message + action and the planning screen where the
// problem is fixed. Pure: needs only the data bundle (which carries content) and a selection.

import { computeIndicators, resolveSelection } from './calculations.js';
import { makeTranslator } from './i18n.js';

const fmt = (n, digits = 0) => Number(n).toFixed(digits);
const pct = (ratio) => fmt(ratio * 100);

export function validateDesign(data, selection) {
  const t = makeTranslator(data.content);
  const ind = computeIndicators(data, selection);
  const { goal, orbit, payloads, power, comm, bus, launcher } = resolveSelection(data, selection);
  const blockers = [];
  const warnings = [];

  const add = (list, severity, code, step, params = {}, tab) => {
    list.push({
      code,
      severity,
      step,
      tab: tab ?? null,
      params,
      message: t(`validation.${code}.message`, params),
      action: t(`validation.${code}.action`, params),
    });
  };
  const block = (code, step, params, tab) => add(blockers, 'blocker', code, step, params, tab);
  const warn = (code, step, params, tab) => add(warnings, 'warning', code, step, params, tab);

  // ---- Blockers ------------------------------------------------------------------------------
  if (!goal) block('missingPriority', 'briefing');
  if (!orbit) block('missingOrbit', 'orbit');
  if (payloads.length === 0) block('noPayload', 'payload');
  if (!bus) block('missingBus', 'spacecraft', {}, 'bus');
  if (!power) block('missingPower', 'spacecraft', {}, 'power');
  if (!comm) block('missingComm', 'spacecraft', {}, 'comm');
  if (!launcher) block('missingLauncher', 'launch');

  if (ind.budgetRemainingM < 0) {
    block('budgetExceeded', 'payload', { over: fmt(-ind.budgetRemainingM, 1), budget: ind.budgetM });
  }
  if (launcher && ind.totalMassKg > launcher.maxPayloadKg) {
    block('launcherTooSmall', 'launch', { mass: fmt(ind.totalMassKg), capacity: launcher.maxPayloadKg });
  }
  if (bus && ind.supportedLoadKg > bus.maxSupportedMassKg) {
    block('busOverloaded', 'spacecraft', { load: fmt(ind.supportedLoadKg), capacity: bus.maxSupportedMassKg }, 'bus');
  }
  if (power && ind.powerMarginW < 0) {
    block('powerDeficit', 'spacecraft', { demand: fmt(ind.totalPowerDemandW), generation: fmt(ind.generationW) }, 'power');
  }
  if (launcher && orbit && !launcher.supportedOrbitIds.includes(orbit.id)) {
    block('orbitIncompatible', 'launch', {
      launcher: t(launcher.nameKey),
      orbit: t(orbit.nameKey),
    });
  }

  // ---- Warnings ------------------------------------------------------------------------------
  if (power && ind.powerMarginW >= 0 && ind.powerMarginRatio < data.game.lowPowerMarginRatio) {
    warn('lowPowerMargin', 'spacecraft', { percent: pct(ind.powerMarginRatio) }, 'power');
  }
  if (power && orbit && ind.batteryCoverage < 1) {
    warn('batteryShort', 'spacecraft', { percent: pct(ind.batteryCoverage) }, 'power');
  }
  if (comm && payloads.length > 0 && ind.downlinkMarginGbPerMonth < 0) {
    warn('downlinkShort', 'spacecraft', { downlink: fmt(ind.downlinkGbPerMonth), data: fmt(ind.payloadDataGbPerMonth) }, 'comm');
  }
  if (bus && comm && ind.projectedBacklogGb > ind.storageGb) {
    warn('overflowRisk', 'spacecraft', { storage: fmt(ind.storageGb) }, 'bus');
  }
  if (payloads.length > 0 && orbit && ind.sciencePotentialTotal < data.game.targetSciencePoints) {
    warn('scienceBelowTarget', 'payload', {
      science: fmt(ind.sciencePotentialTotal, 1),
      target: data.game.targetSciencePoints,
    });
  }
  if (launcher && bus && ind.missionReliability < data.game.lowReliabilityThreshold) {
    warn('lowReliability', 'launch', { percent: pct(ind.missionReliability) });
  }

  return {
    blockers,
    warnings,
    canLaunch: blockers.length === 0,
    indicators: ind,
  };
}
