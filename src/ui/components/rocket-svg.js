// Launch vehicle illustrations. Variants are chosen from the launcher's `visualSlot`.

import { s } from '../dom.js';

const VARIANTS = {
  'rocket-small': { w: 22, h: 150, fin: 14, boosters: 0 },
  'rocket-medium': { w: 30, h: 170, fin: 18, boosters: 0 },
  'rocket-heavy': { w: 36, h: 190, fin: 20, boosters: 2 },
};

let uid = 0;

/** A rocket drawn with its nose at y=0 and engines at the bottom, centred on x=0. */
export function createRocketShape(slot, { flame = false } = {}) {
  const id = `rk${(uid += 1)}`;
  const v = VARIANTS[slot] ?? VARIANTS['rocket-medium'];
  const g = s('g', { class: 'rocket-shape' });
  g.append(
    s('defs', null, s('linearGradient', { id: `${id}-body`, x1: 0, y1: 0, x2: 1, y2: 0 },
      s('stop', { offset: '0', 'stop-color': '#9fb0c6' }),
      s('stop', { offset: '0.45', 'stop-color': '#ffffff' }),
      s('stop', { offset: '1', 'stop-color': '#8497b0' }))),
  );
  for (let i = 0; i < v.boosters; i += 1) {
    const sign = i === 0 ? -1 : 1;
    g.append(
      s('rect', { x: sign * (v.w / 2 + 8) - 6, y: v.h * 0.32, width: 12, height: v.h * 0.55, rx: 5, fill: `url(#${id}-body)`, stroke: '#51627a' }),
      s('path', { d: `M${sign * (v.w / 2 + 8) - 6} ${v.h * 0.32} Q${sign * (v.w / 2 + 8)} ${v.h * 0.2} ${sign * (v.w / 2 + 8) + 6} ${v.h * 0.32}`, fill: '#ff5364' }),
    );
  }
  g.append(
    s('path', { d: `M${-v.fin - v.w / 2} ${v.h * 0.9} L${-v.w / 2} ${v.h * 0.62} V${v.h * 0.9} Z`, fill: '#ff5364', stroke: '#9c2433' }),
    s('path', { d: `M${v.fin + v.w / 2} ${v.h * 0.9} L${v.w / 2} ${v.h * 0.62} V${v.h * 0.9} Z`, fill: '#ff5364', stroke: '#9c2433' }),
    s('path', { d: `M${-v.w / 2} ${v.h * 0.92} V${v.h * 0.2} Q${-v.w / 2} ${v.h * 0.06} 0 0 Q${v.w / 2} ${v.h * 0.06} ${v.w / 2} ${v.h * 0.2} V${v.h * 0.92} Z`, fill: `url(#${id}-body)`, stroke: '#51627a', 'stroke-width': 1.5 }),
    s('path', { d: `M${-v.w / 2} ${v.h * 0.2} Q${-v.w / 2} ${v.h * 0.06} 0 0 Q${v.w / 2} ${v.h * 0.06} ${v.w / 2} ${v.h * 0.2} Z`, fill: '#ff5364' }),
    s('circle', { cx: 0, cy: v.h * 0.32, r: v.w * 0.24, fill: '#1c2740', stroke: '#00e5ff', 'stroke-width': 2 }),
    s('rect', { x: -v.w / 2, y: v.h * 0.5, width: v.w, height: 6, fill: '#00e5ff', opacity: 0.8 }),
    s('rect', { x: -v.w * 0.32, y: v.h * 0.92, width: v.w * 0.64, height: 8, rx: 2, fill: '#51627a' }),
  );
  if (flame) {
    g.append(
      s('path', { class: 'rocket-flame', d: `M${-v.w * 0.28} ${v.h * 0.98} Q0 ${v.h * 1.5} ${v.w * 0.28} ${v.h * 0.98} Z`, fill: '#ffb34a' }),
      s('path', { class: 'rocket-flame-core', d: `M${-v.w * 0.14} ${v.h * 0.98} Q0 ${v.h * 1.25} ${v.w * 0.14} ${v.h * 0.98} Z`, fill: '#fff6d0' }),
    );
  }
  return { el: g, height: v.h, width: v.w + v.fin * 2 };
}

/** Standalone rocket SVG used on launcher cards. `payloadFill` (0..1) shades the payload bay. */
export function createRocketSvg(slot, { label }) {
  const { el, height, width } = createRocketShape(slot);
  const pad = 14;
  const root = s('svg', { viewBox: `${-width / 2 - pad - 14} ${-pad} ${width + pad * 2 + 28} ${height + pad * 2}`, class: 'rocket-svg', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet' });
  root.append(el);
  return root;
}
