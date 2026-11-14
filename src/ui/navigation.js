// Screen order and Continue gating. No game rules here: only "has the player chosen
// something on this step?" so that Next never leads to an empty screen.

import { PLANNING_SCREENS } from '../core/rules.js';

export const isPlanning = (screen) => PLANNING_SCREENS.includes(screen);

export function nextScreen(screen) {
  const i = PLANNING_SCREENS.indexOf(screen);
  return i >= 0 && i < PLANNING_SCREENS.length - 1 ? PLANNING_SCREENS[i + 1] : null;
}

export function prevScreen(screen) {
  const i = PLANNING_SCREENS.indexOf(screen);
  return i > 0 ? PLANNING_SCREENS[i - 1] : 'menu';
}

/** Has the player made the choice(s) this step asks for? (Validity is checked at Review.) */
export function stepComplete(screen, state) {
  switch (screen) {
    case 'briefing':
      return Boolean(state.goalPriorityId);
    case 'orbit':
      return Boolean(state.orbitId);
    case 'payload':
      return state.payloadIds.length > 0;
    case 'spacecraft':
      return Boolean(state.powerId && state.communicationId && state.busId);
    case 'launch':
      return Boolean(state.launcherId);
    default:
      return true;
  }
}

/** Which UI chrome each screen shows. */
export const CHROME = {
  menu: { topbar: false, stepper: false, footer: 'none' },
  briefing: { topbar: true, stepper: true, footer: 'nav' },
  orbit: { topbar: true, stepper: true, footer: 'nav' },
  payload: { topbar: true, stepper: true, footer: 'nav' },
  spacecraft: { topbar: true, stepper: true, footer: 'nav' },
  launch: { topbar: true, stepper: true, footer: 'nav' },
  review: { topbar: true, stepper: true, footer: 'back' },
  animation: { topbar: true, stepper: false, footer: 'message' },
  simulation: { topbar: true, stepper: false, footer: 'message' },
  debrief: { topbar: true, stepper: false, footer: 'message' },
};
