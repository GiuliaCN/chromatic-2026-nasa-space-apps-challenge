// Stylised vector Earth: a full globe with orbit rings (Orbit Selection) and a large "limb" view
// (menu, briefing, simulation, debrief backdrops).

import { s, prefersReducedMotion } from '../dom.js';

let uid = 0;

const CONTINENTS = [
  // Rough, cartoon-like land masses on a 240x240 globe (centre 120,120).
  'M58 70 C70 52 100 48 112 62 C122 74 104 84 108 98 C112 112 92 126 82 118 C70 108 78 98 66 92 C54 86 50 80 58 70 Z',
  'M96 138 C110 132 126 140 124 158 C122 176 112 194 104 190 C94 184 98 170 92 160 C88 150 88 142 96 138 Z',
  'M140 64 C156 56 182 62 188 78 C194 94 176 100 168 96 C158 92 154 104 144 98 C134 92 128 74 140 64 Z',
  'M150 118 C166 112 186 124 184 142 C182 158 168 160 160 152 C150 144 142 126 150 118 Z',
];

function globe(id, r, cx, cy, landDy = 0) {
  const g = s('g');
  g.append(
    s('circle', { cx, cy, r: r * 1.08, fill: `url(#${id}-atmo)` }),
    s('circle', { cx, cy, r, fill: `url(#${id}-ocean)` }),
  );
  const land = s('g', { 'clip-path': `url(#${id}-clip)` });
  const k = (r * 2) / 240;
  for (const d of CONTINENTS) {
    land.append(s('path', { d, fill: '#3fa65a', opacity: 0.92, transform: `translate(${cx - r} ${cy - r + landDy}) scale(${k})` }));
    land.append(s('path', { d, fill: 'none', stroke: '#8be08f', 'stroke-opacity': 0.5, 'stroke-width': 1.2, transform: `translate(${cx - r} ${cy - r + landDy}) scale(${k})` }));
  }
  for (const [x, y, w] of [[70, 60, 30], [150, 100, 34], [100, 170, 28], [170, 150, 22], [60, 130, 20]]) {
    land.append(s('ellipse', { cx: cx - r + x * k, cy: cy - r + landDy + y * k, rx: w * k, ry: 6 * k, fill: '#ffffff', opacity: 0.55 }));
  }
  g.append(land, s('circle', { cx, cy, r, fill: `url(#${id}-shade)` }));
  return g;
}

function defs(id, r, cx, cy) {
  return s(
    'defs',
    null,
    s('radialGradient', { id: `${id}-ocean`, cx: '38%', cy: '34%', r: '75%' },
      s('stop', { offset: '0', 'stop-color': '#4aa9ff' }),
      s('stop', { offset: '0.6', 'stop-color': '#1a5fd1' }),
      s('stop', { offset: '1', 'stop-color': '#08265e' })),
    s('radialGradient', { id: `${id}-atmo`, cx: '50%', cy: '50%', r: '50%' },
      s('stop', { offset: '0.86', 'stop-color': '#4cc8ff', 'stop-opacity': '0.5' }),
      s('stop', { offset: '1', 'stop-color': '#4cc8ff', 'stop-opacity': '0' })),
    s('radialGradient', { id: `${id}-shade`, cx: '34%', cy: '30%', r: '85%' },
      s('stop', { offset: '0.5', 'stop-color': '#020a1c', 'stop-opacity': '0' }),
      s('stop', { offset: '1', 'stop-color': '#020a1c', 'stop-opacity': '0.65' })),
    s('clipPath', { id: `${id}-clip` }, s('circle', { cx, cy, r })),
  );
}

function stars(count, w, h, seed = 7) {
  const g = s('g', { class: 'stars' });
  let x = seed;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i += 1) {
    g.append(s('circle', { cx: rnd() * w, cy: rnd() * h, r: 0.5 + rnd() * 1.3, fill: '#ffffff', opacity: 0.25 + rnd() * 0.65 }));
  }
  return g;
}

const ORBIT_RINGS = {
  leo: { cx: 200, cy: 200, rx: 168, ry: 168, rot: 0, color: '#00e5ff', dash: '' },
  'sun-synchronous': { cx: 200, cy: 200, rx: 70, ry: 178, rot: 12, color: '#ffbf36', dash: '10 8' },
  equatorial: { cx: 200, cy: 200, rx: 188, ry: 46, rot: 0, color: '#39f58a', dash: '' },
};

function ringPath({ cx, cy, rx, ry }) {
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
}

/** Globe with the three orbit rings; update(orbitId) highlights one and flies a satellite on it. */
export function createOrbitEarthSvg({ label }) {
  const id = `ea${(uid += 1)}`;
  const root = s('svg', { viewBox: '0 0 400 400', class: 'earth-svg earth-orbit', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet' });
  root.append(defs(id, 120, 200, 200), stars(40, 400, 400, 11), globe(id, 120, 200, 200));

  const rings = {};
  const sats = {};
  for (const [orbitId, ring] of Object.entries(ORBIT_RINGS)) {
    const g = s('g', { class: 'orbit-ring', transform: `rotate(${ring.rot} 200 200)` });
    const d = ringPath(ring);
    const path = s('path', { id: `${id}-${orbitId}`, d, fill: 'none', stroke: ring.color, 'stroke-width': 3, 'stroke-dasharray': ring.dash, 'stroke-linecap': 'round' });
    const sat = s('g', { class: 'orbit-sat' },
      s('rect', { x: -9, y: -4, width: 18, height: 8, rx: 1.5, fill: '#3d7bff', stroke: '#cfe3ff' }),
      s('rect', { x: -3, y: -6, width: 6, height: 12, rx: 1.5, fill: '#e9eff7', stroke: '#51627a' }));
    sat.append(s('animateMotion', { dur: orbitId === 'equatorial' ? '14s' : '18s', repeatCount: 'indefinite', rotate: 'auto' }, s('mpath', { href: `#${id}-${orbitId}` })));
    g.append(path, sat);
    root.append(g);
    rings[orbitId] = path;
    sats[orbitId] = sat;
  }
  if (prefersReducedMotion()) {
    queueMicrotask(() => root.pauseAnimations?.());
  }

  function update(orbitId) {
    for (const [key, path] of Object.entries(rings)) {
      const active = key === orbitId;
      path.setAttribute('stroke-opacity', active ? 1 : 0.3);
      path.setAttribute('stroke-width', active ? 4 : 2);
      path.classList.toggle('is-active', active);
      sats[key].style.display = active ? '' : 'none';
    }
  }
  update(null);
  return { el: root, update };
}

/** Large Earth limb with sunrise glow and city lights. Pure background art. */
export function createEarthLimbSvg({ label = '', vivid = true } = {}) {
  const id = `el${(uid += 1)}`;
  const root = s('svg', { viewBox: '0 0 800 500', class: `earth-svg earth-limb${vivid ? ' is-vivid' : ''}`, preserveAspectRatio: 'xMidYMax slice', role: label ? 'img' : 'presentation', 'aria-label': label || undefined });
  const cx = 400;
  const cy = 860;
  const r = 560;
  root.append(
    defs(id, r, cx, cy),
    s('defs', null,
      s('radialGradient', { id: `${id}-sun`, cx: '50%', cy: '50%', r: '50%' },
        s('stop', { offset: '0', 'stop-color': '#fff6d0' }),
        s('stop', { offset: '0.25', 'stop-color': '#ffb34a', 'stop-opacity': 0.8 }),
        s('stop', { offset: '1', 'stop-color': '#ff7a1a', 'stop-opacity': 0 }))),
    stars(90, 800, 380, 23),
    globe(id, r, cx, cy, -215),
  );
  const lights = s('g', { 'clip-path': `url(#${id}-clip)` });
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i += 1) {
    lights.append(s('circle', { cx: 250 + rnd() * 380, cy: 380 + rnd() * 110, r: 0.8 + rnd() * 1.3, fill: '#ffd36b', opacity: 0.35 + rnd() * 0.6 }));
  }
  root.append(lights, s('circle', { cx, cy, r, fill: 'none', stroke: '#7fe3ff', 'stroke-opacity': 0.55, 'stroke-width': 3 }),
    s('circle', { cx: 640, cy: 322, r: 70, fill: `url(#${id}-sun)`, class: 'earth-sun' }));
  return { el: root };
}
