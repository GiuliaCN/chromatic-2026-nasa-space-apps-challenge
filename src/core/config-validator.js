import { lookup } from './i18n.js';
import { CONDITION_TYPES, EFFECT_TYPES, EVENT_KINDS, HELP_SCREENS, SCREENS, SOUND_EFFECTS } from './rules.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isNonNeg = (v) => isNum(v) && v >= 0;
const isStr = (v) => typeof v === 'string' && v.length > 0;

const GAME_NUMBERS = [
  'budgetM',
  'durationMonths',
  'targetSciencePoints',
  'operationsCostM',
  'eventChancePerMonth',
  'reliabilitySensitivity',
  'batteryAvailabilityFloor',
  'minEffectMultiplier',
  'lowPowerMarginRatio',
  'lowReliabilityThreshold',
];

/**
 * Validate a data bundle (see createBundle). Returns { ok, errors } where errors is a list of
 * human-readable strings. Never throws, so a broken config can be shown as a friendly error.
 */
export function validateConfig(bundle) {
  const errors = [];
  const err = (msg) => errors.push(msg);

  if (!bundle || !isObj(bundle)) return { ok: false, errors: ['No data bundle was provided.'] };
  const { game, content } = bundle;

  // ---- game.json ---------------------------------------------------------------------------
  if (!isObj(game)) {
    err('game.json must be an object.');
  } else {
    if (!isStr(game.dataVersion)) err('game.json: "dataVersion" must be a non-empty string.');
    if (!isStr(game.missionId)) err('game.json: "missionId" must be a non-empty string.');
    for (const key of GAME_NUMBERS) {
      if (!isNonNeg(game[key])) err(`game.json: "${key}" must be a non-negative number.`);
    }
    if (isNum(game.durationMonths) && (!Number.isInteger(game.durationMonths) || game.durationMonths < 1)) {
      err('game.json: "durationMonths" must be an integer of at least 1.');
    }
    for (const key of ['eventChancePerMonth', 'batteryAvailabilityFloor', 'lowPowerMarginRatio', 'lowReliabilityThreshold']) {
      if (isNum(game[key]) && game[key] > 1) err(`game.json: "${key}" must be at most 1.`);
    }
    if (isNum(game.minEffectMultiplier) && (game.minEffectMultiplier <= 0 || game.minEffectMultiplier > 1)) {
      err('game.json: "minEffectMultiplier" must be greater than 0 and at most 1.');
    }
    if (!Array.isArray(game.planningSteps) || game.planningSteps.length === 0) {
      err('game.json: "planningSteps" must be a non-empty list.');
    }
  }

  if (!isObj(content)) err('content.en.json must be an object.');

  const needKey = (where, key) => {
    if (!isStr(key)) err(`${where}: missing text key.`);
    else if (typeof lookup(content, key) !== 'string') err(`${where}: text key "${key}" not found in content.en.json.`);
  };
  const needList = (where, key) => {
    const v = lookup(content, key);
    if (!Array.isArray(v) || v.length === 0 || !v.every((s) => typeof s === 'string')) {
      err(`${where}: text key "${key}" must be a non-empty list of strings in content.en.json.`);
    }
  };

  // ---- generic list checks -------------------------------------------------------------------
  const checkList = (file, name, list, perItem) => {
    if (!Array.isArray(list) || list.length === 0) {
      err(`${file}: "${name}" must be a non-empty list.`);
      return;
    }
    const seen = new Set();
    list.forEach((item, i) => {
      if (!isObj(item)) return err(`${file}: ${name}[${i}] must be an object.`);
      const label = `${file}: ${name}[${item.id ?? i}]`;
      if (!isStr(item.id)) err(`${label} needs a string "id".`);
      else if (seen.has(item.id)) err(`${label} duplicates id "${item.id}".`);
      else seen.add(item.id);
      perItem(item, label);
    });
  };

  const checkNumbers = (item, label, fields) => {
    for (const f of fields) if (!isNonNeg(item[f])) err(`${label}: "${f}" must be a non-negative number.`);
  };
  const checkText = (item, label) => {
    needKey(`${label} nameKey`, item.nameKey);
    needKey(`${label} descriptionKey`, item.descriptionKey);
  };
  const checkEquipment = (item, label) => {
    checkText(item, label);
    checkNumbers(item, label, ['costM', 'massKg', 'powerW']);
    if (!isStr(item.visualSlot)) err(`${label}: "visualSlot" must be a non-empty string.`);
  };
  const checkUnit01 = (item, label, field) => {
    if (!isNum(item[field]) || item[field] < 0 || item[field] > 1) err(`${label}: "${field}" must be between 0 and 1.`);
  };

  const goalIds = (bundle.goals ?? []).filter((g) => isObj(g)).map((g) => g.id);
  const orbitIds = (bundle.orbits ?? []).filter((o) => isObj(o)).map((o) => o.id);
  const payloadIds = (bundle.payloads ?? []).filter((p) => isObj(p)).map((p) => p.id);

  const checkGoalMap = (map, label, field, positive) => {
    if (!isObj(map)) return err(`${label}: "${field}" must be an object keyed by goal id.`);
    for (const g of goalIds) {
      const v = map[g];
      if (!isNonNeg(v) || (positive && v <= 0)) err(`${label}: "${field}.${g}" must be a ${positive ? 'positive' : 'non-negative'} number.`);
    }
    for (const k of Object.keys(map)) if (!goalIds.includes(k)) err(`${label}: "${field}" references unknown goal "${k}".`);
  };

  // ---- science-goals.json --------------------------------------------------------------------
  checkList('science-goals.json', 'goals', bundle.goals, (g, label) => {
    checkText(g, label);
    needKey(`${label} priorityNameKey`, g.priorityNameKey);
    needKey(`${label} benefitKey`, g.benefitKey);
    needKey(`${label} tradeoffKey`, g.tradeoffKey);
    if (!isNum(g.priorityMultiplier) || g.priorityMultiplier < 1) err(`${label}: "priorityMultiplier" must be a number of at least 1.`);
  });

  // ---- orbits.json -----------------------------------------------------------------------------
  checkList('orbits.json', 'orbits', bundle.orbits, (o, label) => {
    checkText(o, label);
    needKey(`${label} coverageKey`, o.coverageKey);
    needKey(`${label} revisitKey`, o.revisitKey);
    needKey(`${label} abbrKey`, o.abbrKey);
    needList(`${label} advantagesKey`, o.advantagesKey);
    needList(`${label} disadvantagesKey`, o.disadvantagesKey);
    checkNumbers(o, label, ['eclipseDurationH']);
    if (!isNum(o.launchCostMultiplier) || o.launchCostMultiplier <= 0) err(`${label}: "launchCostMultiplier" must be a positive number.`);
    checkGoalMap(o.observationMultiplierByGoal, label, 'observationMultiplierByGoal', true);
  });

  // ---- payloads.json ---------------------------------------------------------------------------
  checkList('payloads.json', 'payloads', bundle.payloads, (p, label) => {
    checkEquipment(p, label);
    checkNumbers(p, label, ['dataGbPerMonth']);
    checkGoalMap(p.scienceByGoal, label, 'scienceByGoal', false);
  });

  // ---- spacecraft.json -------------------------------------------------------------------------
  checkList('spacecraft.json', 'buses', bundle.buses, (b, label) => {
    checkEquipment(b, label);
    checkNumbers(b, label, ['maxSupportedMassKg', 'storageGb']);
    checkUnit01(b, label, 'reliability');
  });
  checkList('spacecraft.json', 'powers', bundle.powers, (p, label) => {
    checkEquipment(p, label);
    checkNumbers(p, label, ['generationW', 'batteryWh']);
  });
  checkList('spacecraft.json', 'comms', bundle.comms, (c, label) => {
    checkEquipment(c, label);
    checkNumbers(c, label, ['downlinkGbPerMonth']);
  });

  // ---- launchers.json --------------------------------------------------------------------------
  checkList('launchers.json', 'launchers', bundle.launchers, (l, label) => {
    checkEquipment(l, label);
    checkNumbers(l, label, ['maxPayloadKg']);
    checkUnit01(l, label, 'reliability');
    if (!Array.isArray(l.supportedOrbitIds) || l.supportedOrbitIds.length === 0) {
      err(`${label}: "supportedOrbitIds" must be a non-empty list.`);
    } else {
      for (const id of l.supportedOrbitIds) if (!orbitIds.includes(id)) err(`${label}: unknown orbit id "${id}" in supportedOrbitIds.`);
    }
  });

  // ---- events.json -----------------------------------------------------------------------------
  const minEffect = isNum(game?.minEffectMultiplier) ? game.minEffectMultiplier : 0;
  checkList('events.json', 'events', bundle.events, (e, label) => {
    checkText(e, label);
    if (!EVENT_KINDS.includes(e.kind)) err(`${label}: "kind" must be one of ${EVENT_KINDS.join(', ')}.`);
    if (!isNum(e.weight) || e.weight <= 0) err(`${label}: "weight" must be a positive number.`);
    if (!Number.isInteger(e.durationMonths) || e.durationMonths < 1) err(`${label}: "durationMonths" must be an integer of at least 1.`);
    if (!Array.isArray(e.effects) || e.effects.length === 0) {
      err(`${label}: "effects" must be a non-empty list.`);
    } else {
      e.effects.forEach((fx, i) => {
        if (!isObj(fx) || !EFFECT_TYPES.includes(fx.type)) {
          err(`${label}: effects[${i}] has unknown type "${fx?.type}". Known types: ${EFFECT_TYPES.join(', ')}.`);
        } else if (!isNum(fx.value) || fx.value < minEffect) {
          err(`${label}: effects[${i}] value ${fx.value} is below minEffectMultiplier (${minEffect}).`);
        }
      });
    }
    if (e.conditions !== undefined) {
      if (!Array.isArray(e.conditions)) {
        err(`${label}: "conditions" must be a list when present.`);
      } else {
        e.conditions.forEach((c, i) => {
          if (!isObj(c) || !CONDITION_TYPES.includes(c.type)) {
            return err(`${label}: conditions[${i}] has unknown type "${c?.type}". Known types: ${CONDITION_TYPES.join(', ')}.`);
          }
          if (c.type === 'hasInstrument' && !payloadIds.includes(c.value)) err(`${label}: conditions[${i}] references unknown instrument "${c.value}".`);
          else if (c.type === 'orbitIs' && !orbitIds.includes(c.value)) err(`${label}: conditions[${i}] references unknown orbit "${c.value}".`);
          else if (c.type === 'goalPriorityIs' && !goalIds.includes(c.value)) err(`${label}: conditions[${i}] references unknown goal "${c.value}".`);
          else if ((c.type === 'powerMarginRatioBelow' || c.type === 'downlinkMarginRatioBelow') && !isNum(c.value)) err(`${label}: conditions[${i}] needs a numeric value.`);
        });
      }
    }
  });

  // ---- audio.json ------------------------------------------------------------------------------
  // Sound files must live inside public/: the game never loads third-party assets at runtime.
  const audio = bundle.audio;
  if (!isObj(audio)) {
    err('audio.json must be an object.');
  } else {
    const checkSound = (sound, label) => {
      if (!isStr(sound.src)) err(`${label}: "src" must be a non-empty string.`);
      else if (/^([a-z][a-z0-9+.-]*:|\/)|(^|\/)\.\.(\/|$)/i.test(sound.src)) err(`${label}: "src" must be a relative path inside public/ (got "${sound.src}").`);
      checkUnit01(sound, label, 'volume');
    };
    checkList('audio.json', 'music', audio.music, checkSound);
    checkList('audio.json', 'effects', audio.effects, checkSound);
    const idsOf = (list) => (Array.isArray(list) ? list.filter(isObj).map((x) => x.id) : []);
    const trackIds = idsOf(audio.music);
    const effectIds = idsOf(audio.effects);
    for (const id of SOUND_EFFECTS) if (!effectIds.includes(id)) err(`audio.json: effect "${id}" is missing.`);
    if (!isObj(audio.musicByScreen)) {
      err('audio.json: "musicByScreen" must be an object keyed by screen id.');
    } else {
      for (const screen of SCREENS) {
        const id = audio.musicByScreen[screen];
        if (id !== null && !trackIds.includes(id)) err(`audio.json: "musicByScreen.${screen}" must be a music id or null (got "${id}").`);
      }
      for (const key of Object.keys(audio.musicByScreen)) if (!SCREENS.includes(key)) err(`audio.json: "musicByScreen" references unknown screen "${key}".`);
    }
    if (!isNonNeg(audio.musicFadeMs)) err('audio.json: "musicFadeMs" must be a non-negative number.');
    if (!Array.isArray(audio.credits) || !audio.credits.every((c) => isObj(c) && ['title', 'author', 'license', 'url'].every((f) => isStr(c[f])))) {
      err('audio.json: "credits" must be a list of { title, author, license, url }.');
    }
  }

  // ---- content: per-screen help, steps, glossary ------------------------------------------------
  if (isObj(content)) {
    for (const screen of HELP_SCREENS) {
      needKey(`help.${screen}.title`, `help.${screen}.title`);
      needKey(`help.${screen}.body`, `help.${screen}.body`);
    }
    for (const step of game?.planningSteps ?? []) {
      if (!isObj(step) || !isStr(step.id)) err('game.json: each planning step needs an "id".');
      else needKey(`planning step "${step.id}" labelKey`, step.labelKey);
    }
    const entries = lookup(content, 'glossary.entries');
    if (!Array.isArray(entries) || entries.length === 0 || !entries.every((e) => isObj(e) && isStr(e.term) && isStr(e.definition))) {
      err('content.en.json: "glossary.entries" must be a non-empty list of { term, definition }.');
    }
  }

  return { ok: errors.length === 0, errors };
}
