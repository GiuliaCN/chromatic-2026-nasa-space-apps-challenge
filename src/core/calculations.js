// Pure derived-indicator functions (escopo-mvp.md section 5.3). No DOM, no storage, no randomness.
// All inputs are the data bundle and a selection { goalPriorityId, orbitId, payloadIds, powerId,
// communicationId, busId, launcherId }. Missing picks are treated as zero so the UI can show
// partial designs while the player is still choosing.

const sum = (list, pick) => list.reduce((acc, item) => acc + (pick(item) ?? 0), 0);

/** Resolve the selected IDs into data objects. Unknown or missing IDs resolve to null. */
export function resolveSelection(data, selection = {}) {
  const payloads = (selection.payloadIds ?? [])
    .map((id) => data.byId.payloads.get(id))
    .filter(Boolean);
  return {
    goal: data.byId.goals.get(selection.goalPriorityId) ?? null,
    orbit: data.byId.orbits.get(selection.orbitId) ?? null,
    payloads,
    power: data.byId.powers.get(selection.powerId) ?? null,
    comm: data.byId.comms.get(selection.communicationId) ?? null,
    bus: data.byId.buses.get(selection.busId) ?? null,
    launcher: data.byId.launchers.get(selection.launcherId) ?? null,
  };
}

/** Per-goal weight: priorityMultiplier for the chosen priority, 1.0 for the rest. */
export function goalWeights(data, goalPriorityId) {
  const weights = {};
  for (const g of data.goals) weights[g.id] = g.id === goalPriorityId ? g.priorityMultiplier : 1;
  return weights;
}

/** Launch cost already scaled by the orbit's launchCostMultiplier. */
export function launchCostM(launcher, orbit) {
  if (!launcher) return 0;
  return launcher.costM * (orbit ? orbit.launchCostMultiplier : 1);
}

/** sciencePotentialByGoal[g] = sum(payload science) × orbit multiplier × goal weight. */
export function sciencePotentialByGoal(data, selection) {
  const { orbit, payloads } = resolveSelection(data, selection);
  const weights = goalWeights(data, selection.goalPriorityId);
  const result = {};
  for (const g of data.goals) {
    const base = sum(payloads, (p) => p.scienceByGoal[g.id]);
    const observation = orbit ? orbit.observationMultiplierByGoal[g.id] : 0;
    result[g.id] = base * observation * weights[g.id];
  }
  return result;
}

export function computeIndicators(data, selection) {
  const { orbit, payloads, power, comm, bus, launcher } = resolveSelection(data, selection);
  const { budgetM, operationsCostM, durationMonths } = data.game;

  const payloadCostM = sum(payloads, (p) => p.costM);
  const launchCost = launchCostM(launcher, orbit);
  // Each item is counted exactly once. The launcher cost is the only one scaled by the orbit.
  const totalCostM =
    (bus?.costM ?? 0) + payloadCostM + (power?.costM ?? 0) + (comm?.costM ?? 0) + launchCost + operationsCostM;

  const payloadMassKg = sum(payloads, (p) => p.massKg);
  const supportedLoadKg = payloadMassKg + (power?.massKg ?? 0) + (comm?.massKg ?? 0);
  const totalMassKg = (bus?.massKg ?? 0) + supportedLoadKg;

  const payloadPowerW = sum(payloads, (p) => p.powerW);
  const totalPowerDemandW = payloadPowerW + (comm?.powerW ?? 0) + (bus?.powerW ?? 0);
  const generationW = power?.generationW ?? 0;
  const powerMarginW = generationW - totalPowerDemandW;
  const powerMarginRatio = totalPowerDemandW > 0 ? powerMarginW / totalPowerDemandW : 1;

  // The battery only bridges the eclipse. It never compensates a generation deficit.
  const eclipseEnergyNeedWh = totalPowerDemandW * (orbit?.eclipseDurationH ?? 0);
  const batteryWh = power?.batteryWh ?? 0;
  const batteryCoverage = eclipseEnergyNeedWh > 0 ? Math.min(1, batteryWh / eclipseEnergyNeedWh) : 1;

  const payloadDataGbPerMonth = sum(payloads, (p) => p.dataGbPerMonth);
  const downlinkGbPerMonth = comm?.downlinkGbPerMonth ?? 0;
  const downlinkMarginGbPerMonth = downlinkGbPerMonth - payloadDataGbPerMonth;
  const storageGb = bus?.storageGb ?? 0;

  const byGoal = sciencePotentialByGoal(data, selection);
  const sciencePotentialTotal = sum(Object.values(byGoal), (v) => v);
  const scienceBaseTotal = sum(payloads, (p) => sum(Object.values(p.scienceByGoal), (v) => v));

  return {
    payloadCostM,
    launchCostM: launchCost,
    totalCostM,
    budgetM,
    budgetRemainingM: budgetM - totalCostM,
    payloadMassKg,
    supportedLoadKg,
    totalMassKg,
    payloadPowerW,
    totalPowerDemandW,
    generationW,
    powerMarginW,
    powerMarginRatio,
    eclipseEnergyNeedWh,
    batteryWh,
    batteryCoverage,
    payloadDataGbPerMonth,
    downlinkGbPerMonth,
    downlinkMarginGbPerMonth,
    storageGb,
    sciencePotentialByGoal: byGoal,
    sciencePotentialTotal,
    scienceBaseTotal,
    missionReliability: (launcher?.reliability ?? 0) * (bus?.reliability ?? 0),
    durationMonths,
    // Largest unsent backlog the buffer would reach over the whole mission if the link is short.
    projectedBacklogGb: Math.max(0, -downlinkMarginGbPerMonth) * durationMonths,
  };
}
