// Modular 2D satellite. Every part has a fixed attachment point, so choosing a card adds or
// removes the matching SVG part (no drag-and-drop). Items map to parts through `visualSlot`.

import { s } from '../dom.js';

const BUS_SIZE = {
  'bus-light': { w: 72, h: 62 },
  'bus-standard': { w: 88, h: 76 },
  'bus-heavy': { w: 106, h: 92 },
};
const DEFAULT_BUS = 'bus-standard';
const DEFAULT_PANELS = 'panels-medium';
const DEFAULT_ANTENNA = 'antenna-dish';

const PANEL_VARIANTS = {
  'panels-small': { sections: 1, w: 58, h: 40 },
  'panels-medium': { sections: 2, w: 50, h: 52 },
  'panels-large': { sections: 3, w: 42, h: 60 },
  'panels-battery': { sections: 2, w: 44, h: 44, battery: true },
};

const ANTENNAS = ['antenna-small', 'antenna-dish', 'antenna-large'];
const INSTRUMENT_SLOTS = ['front-camera', 'front-sensor', 'side-spectrometer', 'bottom-radar', 'rear-lidar'];

let uid = 0;

function defs(id) {
  return s(
    'defs',
    null,
    s('linearGradient', { id: `${id}-metal`, x1: 0, y1: 0, x2: 1, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#f2f6fb' }),
      s('stop', { offset: '1', 'stop-color': '#8697ad' })),
    s('linearGradient', { id: `${id}-gold`, x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#ffd566' }),
      s('stop', { offset: '1', 'stop-color': '#c4860c' })),
    s('linearGradient', { id: `${id}-glass`, x1: 0, y1: 0, x2: 1, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#9cf0ff' }),
      s('stop', { offset: '1', 'stop-color': '#2a7fb5' })),
    s('linearGradient', { id: `${id}-panel`, x1: 0, y1: 0, x2: 1, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#3d7bff' }),
      s('stop', { offset: '1', 'stop-color': '#0b2a8a' })),
    s('radialGradient', { id: `${id}-halo`, cx: '50%', cy: '50%', r: '50%' },
      s('stop', { offset: '0', 'stop-color': '#00e5ff', 'stop-opacity': '0.28' }),
      s('stop', { offset: '1', 'stop-color': '#00e5ff', 'stop-opacity': '0' })),
    s('pattern', { id: `${id}-grid`, width: 13, height: 13, patternUnits: 'userSpaceOnUse' },
      s('rect', { width: 13, height: 13, fill: `url(#${id}-panel)` }),
      s('path', { d: 'M0 0H13M0 0V13', stroke: '#9bc0ff', 'stroke-width': 0.9, 'stroke-opacity': 0.75, fill: 'none' })),
  );
}

function panelWing(id, variant) {
  // Origin is the bus edge; the wing extends toward +x. Mirrored for the left side.
  const g = s('g');
  g.append(s('rect', { x: 0, y: -3, width: 14, height: 6, fill: `url(#${id}-gold)`, rx: 2 }));
  let x = 14;
  for (let i = 0; i < variant.sections; i += 1) {
    g.append(
      s('rect', { x, y: -variant.h / 2, width: variant.w, height: variant.h, fill: `url(#${id}-grid)`, stroke: '#cfe3ff', 'stroke-width': 1.4, rx: 2 }),
      s('rect', { x: x + 2, y: -variant.h / 2 + 2, width: variant.w - 4, height: 5, fill: '#ffffff', opacity: 0.12, rx: 2 }),
    );
    x += variant.w + 4;
  }
  return g;
}

function dish(r, withFeed) {
  const g = s('g');
  g.append(
    s('rect', { x: -2, y: -r * 0.2, width: 4, height: r * 0.5, fill: '#7d8ea3' }),
    s('ellipse', { cx: 0, cy: -r * 0.9, rx: r, ry: r * 0.62, fill: '#e9eff7', stroke: '#8da0b6', 'stroke-width': 1.5, transform: `rotate(-18 0 ${-r * 0.9})` }),
    s('ellipse', { cx: 0, cy: -r * 0.9, rx: r * 0.7, ry: r * 0.42, fill: '#c3cfdd', transform: `rotate(-18 0 ${-r * 0.9})` }),
  );
  if (withFeed) g.append(s('line', { x1: 0, y1: -r * 0.9, x2: r * 0.35, y2: -r * 1.9, stroke: '#ffcf5a', 'stroke-width': 2 }), s('circle', { cx: r * 0.35, cy: -r * 1.9, r: 3.2, fill: '#ffcf5a' }));
  return g;
}

function buildAntenna(slot) {
  const g = s('g');
  if (slot === 'antenna-small') {
    g.append(s('line', { x1: 0, y1: 0, x2: 0, y2: -32, stroke: '#c3cfdd', 'stroke-width': 2.5 }), s('circle', { cx: 0, cy: -34, r: 4, fill: '#ffcf5a' }));
  } else if (slot === 'antenna-large') {
    g.append(dish(30, true));
  } else {
    g.append(dish(20, true));
  }
  return g;
}

function buildInstrument(id, slot) {
  const g = s('g');
  switch (slot) {
    case 'front-camera':
      g.append(
        s('rect', { x: -14, y: -2, width: 28, height: 16, rx: 4, fill: `url(#${id}-metal)`, stroke: '#51627a' }),
        s('circle', { cx: 0, cy: 18, r: 13, fill: '#1c2740', stroke: '#ffcf5a', 'stroke-width': 3 }),
        s('circle', { cx: 0, cy: 18, r: 8, fill: '#6d3cd0' }),
        s('circle', { cx: -3, cy: 15, r: 2.5, fill: '#ffffff', opacity: 0.85 }),
      );
      break;
    case 'front-sensor':
      g.append(
        s('rect', { x: -8, y: -2, width: 16, height: 10, rx: 3, fill: `url(#${id}-metal)`, stroke: '#51627a' }),
        s('path', { d: 'M-10 8 A10 10 0 0 0 10 8 Z', fill: '#ff8a3d', stroke: '#b4470b', 'stroke-width': 1.5 }),
        s('circle', { cx: 0, cy: 9, r: 3, fill: '#ffe0b0' }),
      );
      break;
    case 'side-spectrometer':
      g.append(
        s('rect', { x: -18, y: -13, width: 18, height: 26, rx: 3, fill: `url(#${id}-metal)`, stroke: '#51627a' }),
        s('rect', { x: -15, y: -8, width: 4, height: 16, rx: 1.5, fill: '#39f58a' }),
        s('rect', { x: -8, y: -8, width: 4, height: 16, rx: 1.5, fill: '#00e5ff' }),
      );
      break;
    case 'bottom-radar':
      g.append(
        s('line', { x1: -26, y1: -16, x2: -34, y2: 2, stroke: '#7d8ea3', 'stroke-width': 3 }),
        s('line', { x1: 26, y1: -16, x2: 34, y2: 2, stroke: '#7d8ea3', 'stroke-width': 3 }),
        s('rect', { x: -48, y: 0, width: 96, height: 12, rx: 3, fill: '#d6dfeb', stroke: '#51627a' }),
        s('path', { d: 'M-42 6H42', stroke: '#8a4bff', 'stroke-width': 3, 'stroke-dasharray': '6 4' }),
      );
      break;
    case 'rear-lidar':
      g.append(
        s('rect', { x: -10, y: -16, width: 20, height: 18, rx: 4, fill: `url(#${id}-metal)`, stroke: '#51627a' }),
        s('ellipse', { cx: 0, cy: -16, rx: 10, ry: 4, fill: '#ff5364' }),
        s('path', { d: 'M0 -20V-34', stroke: '#ff5364', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }),
      );
      break;
    default:
      g.append(s('rect', { x: -10, y: -10, width: 20, height: 20, rx: 4, fill: '#9fb0c6' }));
  }
  return g;
}

function buildBus(id, size) {
  const { w, h } = size;
  const g = s('g');
  g.append(
    s('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 10, fill: `url(#${id}-metal)`, stroke: '#51627a', 'stroke-width': 2 }),
    s('rect', { x: -w / 2 + 8, y: -h / 2 + 8, width: w - 16, height: h - 16, rx: 6, fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.5, 'stroke-width': 1.5 }),
    s('rect', { x: -w / 2 + w * 0.22, y: -h / 2 + h * 0.18, width: w * 0.34, height: h * 0.3, rx: 4, fill: `url(#${id}-glass)`, stroke: '#1d5f8a', 'stroke-width': 1.5 }),
  );
  for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.append(s('rect', { x: cx * (w / 2) - 5, y: cy * (h / 2) - 5, width: 10, height: 10, rx: 2.5, fill: `url(#${id}-gold)`, stroke: '#8a5a06' }));
  }
  if (w > 100) {
    for (const x of [-w * 0.15, w * 0.05, w * 0.25]) g.append(s('line', { x1: x, y1: h * 0.08, x2: x, y2: h * 0.4, stroke: '#51627a', 'stroke-width': 2 }));
  }
  return g;
}

/**
 * @param {{ t: Function, vivid?: boolean }} opts
 * @returns {{ el: SVGElement, update(items): void, setEffects(effects): void }}
 *   `items` = { bus, power, comm, payloads } resolved data objects (any may be null/empty).
 */
export function createSpacecraftSvg({ t, vivid = false }) {
  const id = `sc${(uid += 1)}`;
  const root = s('svg', { viewBox: '-10 10 420 290', class: `spacecraft-svg${vivid ? ' is-vivid' : ''}`, role: 'img', preserveAspectRatio: 'xMidYMid meet' });
  root.append(defs(id), s('circle', { cx: 200, cy: 150, r: 150, fill: `url(#${id}-halo)` }));

  const ghost = s('g', { class: 'sc-ghost', transform: 'translate(200 150)' });
  ghost.append(s('rect', { x: -44, y: -38, width: 88, height: 76, rx: 10, fill: 'none', stroke: '#00e5ff', 'stroke-dasharray': '6 6', 'stroke-opacity': 0.6 }));

  // Parts (outer <g> positions, inner <g class="part"> animates in and out).
  const part = (child) => s('g', { class: 'part is-off' }, child);

  const buses = {};
  const busLayer = s('g', { transform: 'translate(200 150)' });
  for (const [slot, size] of Object.entries(BUS_SIZE)) {
    buses[slot] = part(buildBus(id, size));
    busLayer.append(buses[slot]);
  }

  const wings = { left: s('g', { class: 'sc-wing' }), right: s('g', { class: 'sc-wing' }) };
  const wingParts = { left: {}, right: {} };
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? -1 : 1;
    const mirror = s('g', { transform: `scale(${sign} 1)` });
    for (const [slot, variant] of Object.entries(PANEL_VARIANTS)) {
      wingParts[side][slot] = part(panelWing(id, variant));
      mirror.append(wingParts[side][slot]);
    }
    wings[side].append(mirror);
  }
  const batteryPack = s('g', { transform: 'translate(200 150)' });
  const batteryPart = part(
    s('g', null,
      s('rect', { x: -30, y: 0, width: 26, height: 14, rx: 3, fill: '#39f58a', stroke: '#0c7a3d', 'stroke-width': 1.5, transform: 'translate(0 0)' }),
      s('rect', { x: 4, y: 0, width: 26, height: 14, rx: 3, fill: '#39f58a', stroke: '#0c7a3d', 'stroke-width': 1.5 })),
  );
  batteryPack.append(batteryPart);

  const antennaGroup = s('g');
  const antennaParts = {};
  for (const slot of ANTENNAS) {
    antennaParts[slot] = part(buildAntenna(slot));
    antennaGroup.append(antennaParts[slot]);
  }

  const instrumentOuter = {};
  const instrumentParts = {};
  const instrumentLayer = s('g');
  for (const slot of INSTRUMENT_SLOTS) {
    instrumentParts[slot] = part(buildInstrument(id, slot));
    instrumentOuter[slot] = s('g', null, instrumentParts[slot]);
    instrumentLayer.append(instrumentOuter[slot]);
  }

  root.append(ghost, wings.left, wings.right, batteryPack, busLayer, antennaGroup, instrumentLayer);

  // `ghost` renders a faint placeholder for a part the player has not chosen yet.
  const on = (el, flag, ghost = false) => {
    el.classList.toggle('is-off', !flag);
    el.classList.toggle('is-ghost', flag && ghost);
  };

  function update({ bus, power, comm, payloads = [] } = {}) {
    const chosenBus = bus && BUS_SIZE[bus.visualSlot] ? bus.visualSlot : null;
    const busSlot = chosenBus ?? DEFAULT_BUS;
    const size = BUS_SIZE[busSlot];
    for (const [slot, el] of Object.entries(buses)) on(el, slot === busSlot, !chosenBus);
    ghost.style.display = 'none';

    // CSS transform (not the attribute) so --fold can animate the panel deployment.
    wings.left.style.transform = `translate(${200 - size.w / 2}px, 150px) scaleX(var(--fold, 1))`;
    wings.right.style.transform = `translate(${200 + size.w / 2}px, 150px) scaleX(var(--fold, 1))`;
    const chosenPower = power && PANEL_VARIANTS[power.visualSlot] ? power.visualSlot : null;
    const powerSlot = chosenPower ?? DEFAULT_PANELS;
    for (const side of ['left', 'right']) for (const slot of Object.keys(PANEL_VARIANTS)) on(wingParts[side][slot], slot === powerSlot, !chosenPower);
    on(batteryPart, chosenPower === 'panels-battery');

    antennaGroup.setAttribute('transform', `translate(200 ${150 - size.h / 2})`);
    const chosenAnt = comm && ANTENNAS.includes(comm.visualSlot) ? comm.visualSlot : null;
    const antSlot = chosenAnt ?? DEFAULT_ANTENNA;
    for (const slot of ANTENNAS) on(antennaParts[slot], slot === antSlot, !chosenAnt);

    const slots = new Set(payloads.map((p) => p.visualSlot));
    const hh = size.h / 2;
    const ww = size.w / 2;
    const place = {
      'front-camera': [200 - size.w / 4, 150 + hh - 2],
      'front-sensor': [200 + size.w / 4, 150 + hh - 2],
      'side-spectrometer': [200 - ww, 150 - hh * 0.35],
      'bottom-radar': [200, 150 + hh + 32],
      'rear-lidar': [200 + size.w / 4, 150 - hh],
    };
    for (const slot of INSTRUMENT_SLOTS) {
      instrumentOuter[slot].setAttribute('transform', `translate(${place[slot][0]} ${place[slot][1]})`);
      on(instrumentParts[slot], slots.has(slot));
    }

    const names = [bus, power, comm, ...payloads].filter(Boolean).map((i) => t(i.nameKey));
    root.setAttribute('aria-label', names.length ? t('app.satelliteAlt', { parts: names.join(', ') }) : t('app.satelliteFrameAlt'));
  }

  /** Event feedback: { panelDim, instrumentFault, linkLost, boosted } (booleans). */
  function setEffects(effects = {}) {
    root.classList.toggle('fx-panel-dim', Boolean(effects.panelDim));
    root.classList.toggle('fx-instrument-fault', Boolean(effects.instrumentFault));
    root.classList.toggle('fx-link-lost', Boolean(effects.linkLost));
    root.classList.toggle('fx-boosted', Boolean(effects.boosted));
  }

  /** Fold the solar wings (launch animation) or open them. */
  function setFolded(folded) {
    root.classList.toggle('is-folded', Boolean(folded));
  }

  update({});
  return { el: root, update, setEffects, setFolded };
}
