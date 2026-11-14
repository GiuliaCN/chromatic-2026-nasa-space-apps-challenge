// Game state and transitions. All functions are pure: (state, ...args) => new state.
// The state stores IDs only (never whole config objects), plus the seed once launched.

import { SCHEMA_VERSION, SCREENS, PLANNING_SCREENS } from './rules.js';
import { simulateMission } from './simulation.js';
import { validateDesign } from './validation.js';

export function createInitialState(data) {
  return {
    schemaVersion: SCHEMA_VERSION,
    dataVersion: data.game.dataVersion,
    screen: 'menu',
    phase: 'planning', // planning | launched | debrief
    missionId: data.game.missionId,
    goalPriorityId: null,
    orbitId: null,
    payloadIds: [],
    powerId: null,
    communicationId: null,
    busId: null,
    launcherId: null,
    seed: null, // null until Approve and Launch
    simulationResult: null,
  };
}

/** The slice of state that describes the player's design. */
export function selectionOf(state) {
  return {
    goalPriorityId: state.goalPriorityId,
    orbitId: state.orbitId,
    payloadIds: state.payloadIds,
    powerId: state.powerId,
    communicationId: state.communicationId,
    busId: state.busId,
    launcherId: state.launcherId,
  };
}

const planningOnly = (state) => state.phase === 'planning';

export function startNewMission(data) {
  return { ...createInitialState(data), screen: 'briefing' };
}

export function goTo(state, screen) {
  if (!SCREENS.includes(screen)) return state;
  // Once launched the design is frozen: planning screens are only reachable after Try Again.
  if (PLANNING_SCREENS.includes(screen) && !planningOnly(state)) return state;
  return { ...state, screen };
}

export const selectGoal = (state, id) => (planningOnly(state) ? { ...state, goalPriorityId: id } : state);
export const selectOrbit = (state, id) => (planningOnly(state) ? { ...state, orbitId: id } : state);
export const selectPower = (state, id) => (planningOnly(state) ? { ...state, powerId: id } : state);
export const selectComm = (state, id) => (planningOnly(state) ? { ...state, communicationId: id } : state);
export const selectBus = (state, id) => (planningOnly(state) ? { ...state, busId: id } : state);
export const selectLauncher = (state, id) => (planningOnly(state) ? { ...state, launcherId: id } : state);

export function togglePayload(state, id) {
  if (!planningOnly(state)) return state;
  const has = state.payloadIds.includes(id);
  return { ...state, payloadIds: has ? state.payloadIds.filter((p) => p !== id) : [...state.payloadIds, id] };
}

/**
 * Approve and Launch: only possible without blockers. Freezes the configuration by generating
 * the seed and running the (deterministic) simulation once. Returns the same state if blocked.
 */
export function approveLaunch(state, data, seed) {
  if (!planningOnly(state)) return state;
  const check = validateDesign(data, selectionOf(state));
  if (!check.canLaunch) return state;
  const simulationResult = simulateMission(data, selectionOf(state), seed);
  return { ...state, phase: 'launched', seed, simulationResult, screen: 'animation' };
}

export function finishSimulation(state) {
  if (state.phase !== 'launched') return state;
  return { ...state, phase: 'debrief', screen: 'debrief' };
}

/** Try Again discards the result and the seed; a new seed is generated at the next launch. */
export function tryAgain(state) {
  return { ...state, phase: 'planning', seed: null, simulationResult: null, screen: 'review' };
}

// ---- small observable store used by the UI ---------------------------------------------------

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    update(fn) {
      const next = fn(state);
      if (next === state) return;
      state = next;
      for (const l of listeners) l(state);
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
