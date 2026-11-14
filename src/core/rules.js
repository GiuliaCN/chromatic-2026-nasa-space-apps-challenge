// Rule vocabulary understood by the engine. JSON may only reference these types.
// Adding a new type means adding code in simulation.js AND tests.

export const EFFECT_TYPES = [
  'powerGenerationMultiplier',
  'instrumentAvailabilityMultiplier',
  'downlinkMultiplier',
  'scienceOpportunityMultiplier',
];

export const CONDITION_TYPES = [
  'powerMarginRatioBelow',
  'downlinkMarginRatioBelow',
  'hasInstrument',
  'orbitIs',
  'goalPriorityIs',
];

export const EVENT_KINDS = ['negative', 'positive'];

export const SCHEMA_VERSION = 1;

/** Screens in game order. `phase` tells the state machine which phase owns each screen. */
export const SCREENS = [
  'menu',
  'briefing',
  'orbit',
  'payload',
  'spacecraft',
  'launch',
  'review',
  'animation',
  'simulation',
  'debrief',
];

export const PLANNING_SCREENS = ['briefing', 'orbit', 'payload', 'spacecraft', 'launch', 'review'];

/** Content sections every screen must provide a help text for. */
export const HELP_SCREENS = SCREENS;
