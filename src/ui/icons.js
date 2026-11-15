// Small stroke icons for the stepper. Static, trusted markup.
import { s } from './dom.js';

const PATHS = {
  briefing: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7',
  orbit: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 17c4 3 12 0 17-7 M19 6c-2-2-6-1-10 1',
  payload: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5',
  spacecraft: 'M13 2L5 14h6l-1 8 8-12h-6z',
  launch: 'M12 2c4 3 5 8 4 13l-4 3-4-3c-1-5 0-10 4-13z M12 9m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0 M8 15l-3 3 M16 15l3 3',
  review: 'M5 4h14v17H5z M9 4V2h6v2 M8.5 13l2.2 2.2L15.5 10',
};

export function createStepIcon(id) {
  return s('svg', { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, s('path', { d: PATHS[id] ?? PATHS.briefing }));
}

/** Generic small icons used by metrics. */
export function createIcon(name) {
  const paths = {
    cost: 'M12 3c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3z M5 6v6c0 1.7 3 3 7 3s7-1.3 7-3V6 M5 12v6c0 1.7 3 3 7 3s7-1.3 7-3v-6',
    mass: 'M6 8h12l2 12H4z M9 8a3 3 0 0 1 6 0',
    power: 'M13 2L5 14h6l-1 8 8-12h-6z',
    data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
    science: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3',
    battery: 'M4 8h14v8H4z M18 11h2v2h-2z M8 10v4 M11 10v4',
    signal: 'M5 19a10 10 0 0 1 14 0 M8 16a6 6 0 0 1 8 0 M12 19h.01',
  };
  return s('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, s('path', { d: paths[name] ?? paths.data }));
}

/** Goal icons keyed by the goal's `visualVariant`. */
export function createGoalIcon(variant) {
  const paths = {
    fire: 'M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
    forest: 'M12 3l5 7h-3l4 6h-5v5h-2v-5H6l4-6H7z',
    air: 'M3 8h11a3 3 0 1 0-3-3 M3 12h16a3 3 0 1 1-3 3 M3 16h8',
  };
  return s('svg', { viewBox: '0 0 24 24', width: 28, height: 28, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, s('path', { d: paths[variant] ?? paths.air }));
}
