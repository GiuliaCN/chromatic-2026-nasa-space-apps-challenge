// Calibration helper: enumerates every valid design and prints success rates over fixed seeds.
// Usage: node scripts/explore-balance.mjs [minPayloads] [maxPayloads]
import { loadData, enumerateSelections, FIXED_SEEDS } from '../tests/helpers.js';
import { validateDesign } from '../src/core/validation.js';
import { simulateMission } from '../src/core/simulation.js';

const data = loadData();
const rows = [];
for (const sel of enumerateSelections(data)) {
  const v = validateDesign(data, sel);
  if (!v.canLaunch) continue;
  let wins = 0, sci = 0;
  for (const seed of FIXED_SEEDS) {
    const r = simulateMission(data, sel, seed, { explain: false }).report;
    if (r.success) wins += 1;
    sci += r.totalScienceEarned;
  }
  const i = v.indicators;
  rows.push({ sel, wins, sci: sci / FIXED_SEEDS.length, cost: i.totalCostM, mass: i.totalMassKg, pot: i.sciencePotentialTotal, warn: v.warnings.map((w) => w.code) });
}
const n = (s) => s.payloadIds.length;
console.log('valid designs:', rows.length);
for (let k = 1; k <= 5; k += 1) {
  const r = rows.filter((x) => n(x.sel) === k);
  console.log(`payloads=${k}: valid=${r.length}, win>=9/10: ${r.filter((x) => x.wins >= 9).length}, win>=1: ${r.filter((x) => x.wins >= 1).length}`);
}
for (const goal of data.goals.map((g) => g.id)) {
  const r = rows.filter((x) => x.sel.goalPriorityId === goal);
  console.log(`priority=${goal}: valid=${r.length}, win>=9/10: ${r.filter((x) => x.wins >= 9).length}`);
}
const top = rows.filter((x) => x.wins >= 9).sort((a, b) => a.cost - b.cost);
console.log('\ncheapest robust winners:');
for (const x of top.slice(0, 12)) console.log(x.wins, x.cost.toFixed(0), x.mass.toFixed(0), x.sci.toFixed(1), JSON.stringify(x.sel), x.warn.join(','));
for (const k of [2, 3]) {
  console.log(`\nbest ${k}-payload designs by wins/sci:`);
  const r = rows.filter((x) => n(x.sel) === k).sort((a, b) => b.wins - a.wins || b.sci - a.sci).slice(0, 6);
  for (const x of r) console.log(x.wins, x.cost.toFixed(0), x.mass.toFixed(0), x.sci.toFixed(1), x.pot.toFixed(1), x.sel.goalPriorityId, x.sel.orbitId, x.sel.payloadIds.join('+'), x.sel.busId, x.sel.powerId, x.sel.communicationId, x.sel.launcherId, x.warn.join(','));
}
