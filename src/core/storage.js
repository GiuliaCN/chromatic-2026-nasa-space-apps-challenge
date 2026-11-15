// Versioned localStorage persistence. Saves IDs + versions + seed only; the simulation result is
// re-derived on load (the simulation is deterministic). Any problem with a save discards it safely.

import { SCHEMA_VERSION, SCREENS } from './rules.js';
import { simulateMission } from './simulation.js';
import { selectionOf } from './game-state.js';
import { validateDesign } from './validation.js';

export const SAVE_KEY = 'chromatic.save.v1';

const PHASES = ['planning', 'launched', 'debrief'];

export function serializeState(state) {
  const { simulationResult, ...rest } = state; // eslint-disable-line no-unused-vars
  return JSON.stringify(rest);
}

/** Returns true when the state was saved. Never throws (quota errors, private mode...). */
export function saveState(storage, state) {
  try {
    storage.setItem(SAVE_KEY, serializeState(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage) {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(storage) {
  try {
    return storage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

// ---- audio preferences ----------------------------------------------------------------------
// Kept apart from the mission save: starting a new mission must not reset the player's sound choice.

export const AUDIO_PREFS_KEY = 'chromatic.audio.v1';
export const DEFAULT_AUDIO_PREFS = Object.freeze({ music: true, effects: true });

/** Never throws; anything unreadable falls back to the defaults (sound on). */
export function loadAudioPrefs(storage) {
  try {
    const saved = JSON.parse(storage.getItem(AUDIO_PREFS_KEY));
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_AUDIO_PREFS };
    return {
      music: typeof saved.music === 'boolean' ? saved.music : DEFAULT_AUDIO_PREFS.music,
      effects: typeof saved.effects === 'boolean' ? saved.effects : DEFAULT_AUDIO_PREFS.effects,
    };
  } catch {
    return { ...DEFAULT_AUDIO_PREFS };
  }
}

export function saveAudioPrefs(storage, prefs) {
  try {
    storage.setItem(AUDIO_PREFS_KEY, JSON.stringify({ music: Boolean(prefs.music), effects: Boolean(prefs.effects) }));
    return true;
  } catch {
    return false;
  }
}

const known = (map, id) => id === null || map.has(id);

/**
 * Load and verify a save against the current data.
 * Returns { state } on success, { state: null } when there is no save, or
 * { state: null, discarded: true, reason } when a save existed but cannot be used.
 */
export function loadState(storage, data) {
  let text;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch {
    return { state: null };
  }
  if (text === null) return { state: null };

  const discard = (reason) => {
    clearSave(storage);
    return { state: null, discarded: true, reason };
  };

  let saved;
  try {
    saved = JSON.parse(text);
  } catch {
    return discard('unreadable');
  }
  if (!saved || typeof saved !== 'object') return discard('unreadable');
  if (saved.schemaVersion !== SCHEMA_VERSION) return discard('schemaVersion');
  if (saved.dataVersion !== data.game.dataVersion) return discard('dataVersion');
  if (!SCREENS.includes(saved.screen) || !PHASES.includes(saved.phase)) return discard('invalid');
  if (!Array.isArray(saved.payloadIds)) return discard('invalid');

  const ok =
    known(data.byId.goals, saved.goalPriorityId) &&
    known(data.byId.orbits, saved.orbitId) &&
    saved.payloadIds.every((id) => data.byId.payloads.has(id)) &&
    known(data.byId.powers, saved.powerId) &&
    known(data.byId.comms, saved.communicationId) &&
    known(data.byId.buses, saved.busId) &&
    known(data.byId.launchers, saved.launcherId);
  if (!ok) return discard('unknownIds');

  const state = { ...saved, simulationResult: null };
  if (state.phase !== 'planning') {
    if (!Number.isInteger(state.seed)) return discard('invalid');
    try {
      if (!validateDesign(data, selectionOf(state)).canLaunch) return discard('invalid');
      state.simulationResult = simulateMission(data, selectionOf(state), state.seed);
    } catch {
      return discard('invalid');
    }
  } else {
    state.seed = null;
  }
  return { state };
}
