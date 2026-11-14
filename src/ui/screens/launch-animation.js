// Short, skippable launch sequence. A stage counter (data-stage) drives CSS transitions;
// with prefers-reduced-motion the final frame is shown at once and nothing moves.

import { h, s, prefersReducedMotion } from '../dom.js';
import { createRocketShape } from '../components/rocket-svg.js';
import { createSpacecraftSvg } from '../components/spacecraft-svg.js';
import { createEarthLimbSvg } from '../components/earth-svg.js';

const STAGE_MS = [3200, 2200, 2000, 2000, 2000, 1500]; // ~13 s total
const CAPTIONS = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'];

function tower() {
  const g = s('g', { class: 'anim-tower' });
  g.append(s('rect', { x: 130, y: 150, width: 16, height: 400, fill: '#27375a' }), s('rect', { x: 250, y: 150, width: 16, height: 400, fill: '#27375a' }));
  for (let y = 170; y < 540; y += 46) {
    g.append(s('path', { d: `M146 ${y} L250 ${y + 46} M250 ${y} L146 ${y + 46}`, stroke: '#f0a24a', 'stroke-width': 4, fill: 'none' }), s('rect', { x: 130, y, width: 136, height: 5, fill: '#f0a24a' }));
  }
  g.append(s('rect', { x: 110, y: 130, width: 176, height: 24, rx: 4, fill: '#f0a24a' }), s('rect', { x: 190, y: 90, width: 5, height: 44, fill: '#f0a24a' }), s('circle', { cx: 192, cy: 86, r: 6, fill: '#ff5364' }));
  g.append(s('rect', { x: 262, y: 300, width: 70, height: 10, fill: '#f0a24a' }), s('rect', { x: 262, y: 420, width: 70, height: 10, fill: '#f0a24a' }));
  return g;
}

function cloud(x, y, k) {
  const g = s('g', { class: 'anim-cloud', transform: `translate(${x} ${y}) scale(${k})` });
  for (const [cx, cy, r] of [[0, 0, 60], [60, -18, 74], [128, 0, 62], [64, 22, 70], [-30, 24, 46], [160, 22, 44]]) g.append(s('circle', { cx, cy, r, fill: '#ffd9b0' }), s('circle', { cx, cy: cy + 6, r: r * 0.8, fill: '#ffb88a', opacity: 0.55 }));
  return g;
}

export function mountLaunchAnimation(ctx) {
  const { t, act, data } = ctx;
  const reduced = prefersReducedMotion();
  let timer = null;
  let countdownTimer = null;

  const scene = s('svg', { viewBox: '0 0 1200 620', class: 'anim-scene', role: 'img', 'aria-label': t('screen.animation.alt'), preserveAspectRatio: 'xMidYMid slice' });
  scene.dataset.stage = '1';
  scene.append(
    s('defs', null, s('linearGradient', { id: 'anim-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#1a1250' }),
      s('stop', { offset: '0.55', 'stop-color': '#5a2f8f' }),
      s('stop', { offset: '1', 'stop-color': '#ff9a5a' }))),
    s('rect', { width: 1200, height: 620, fill: 'url(#anim-sky)', class: 'anim-sky' }),
    s('rect', { width: 1200, height: 620, fill: '#050b1f', class: 'anim-space' }),
  );
  for (let i = 0; i < 70; i += 1) scene.append(s('circle', { cx: (i * 173) % 1200, cy: (i * 97) % 380, r: 1 + (i % 3) * 0.6, fill: '#fff', opacity: 0.35 + (i % 5) * 0.12, class: 'anim-star' }));

  // Ground scene.
  const ground = s('g', { class: 'anim-ground' });
  ground.append(tower(), s('rect', { x: 0, y: 540, width: 1200, height: 80, fill: '#241a46' }), s('rect', { x: 90, y: 530, width: 250, height: 14, fill: '#3b2d6b' }));
  scene.append(ground);

  // Earth view that rises in for the later stages.
  const earthWrap = s('g', { class: 'anim-earth' });
  const earth = createEarthLimbSvg({ vivid: true });
  earth.el.setAttribute('x', 0);
  earth.el.setAttribute('y', 250);
  earth.el.setAttribute('width', 1200);
  earth.el.setAttribute('height', 370);
  earthWrap.append(earth.el);
  scene.append(earthWrap);

  // Rocket.
  const launcher = ctx.store.getState().launcherId ? data.byId.launchers.get(ctx.store.getState().launcherId) : data.launchers[1];
  const rocket = createRocketShape(launcher.visualSlot, { flame: true });
  const rocketOuter = s('g', { class: 'anim-rocket-pos', transform: 'translate(300 0)' });
  const rocketInner = s('g', { class: 'anim-rocket', transform: `translate(0 ${540 - rocket.height})` }, rocket.el);
  rocketOuter.append(rocketInner);
  scene.append(rocketOuter);

  // Spent first stage: falls away at separation (stage 4).
  const spent = createRocketShape('rocket-small', { flame: false });
  const spentEl = s('g', { class: 'anim-spent' }, s('g', { transform: `translate(0 ${540 - spent.height})` }, spent.el));
  scene.append(spentEl);

  // Smoke and clouds near the pad.
  const smoke = s('g', { class: 'anim-smoke' });
  smoke.append(cloud(180, 540, 1.1), cloud(330, 548, 1.3), cloud(470, 536, 0.9), cloud(40, 556, 1.0));
  scene.append(smoke);

  // Satellite, released after separation.
  const sat = createSpacecraftSvg({ t, vivid: true });
  const st = ctx.store.getState();
  const items = ctx.derive(st).items;
  sat.update(items);
  sat.el.setAttribute('x', 740);
  sat.el.setAttribute('y', 60);
  sat.el.setAttribute('width', 380);
  sat.el.setAttribute('height', 285);
  sat.setFolded(true);
  const satWrap = s('g', { class: 'anim-sat' }, sat.el);
  scene.append(satWrap);

  const countdown = h('div', { class: 'anim-countdown', 'aria-hidden': 'true' });
  const caption = h('p', { class: 'anim-caption', role: 'status' });
  const skip = h('button', { type: 'button', class: 'btn btn--primary', onClick: () => act.skipAnimation(), text: reduced ? t('nav.continue') : t('screen.animation.skip') });

  const el = h('section', { class: 'screen screen--animation' }, h('div', { class: 'anim-frame' }, scene, countdown), h('div', { class: 'anim-bar' }, caption, skip));

  function setStage(n) {
    scene.dataset.stage = String(n);
    sat.setFolded(n < 5);
    caption.textContent = t(`screen.animation.${CAPTIONS[n - 1]}`);
    if (n !== 1) countdown.textContent = n === 2 ? t('screen.animation.liftoff') : '';
  }

  function runCountdown() {
    let n = 3;
    countdown.textContent = t('screen.animation.countdown', { n });
    countdownTimer = setInterval(() => {
      n -= 1;
      countdown.textContent = n > 0 ? t('screen.animation.countdown', { n }) : '';
      if (n <= 0) clearInterval(countdownTimer);
    }, STAGE_MS[0] / 3);
  }

  function run(stage) {
    setStage(stage);
    if (stage === 1) runCountdown();
    if (stage >= CAPTIONS.length) {
      timer = setTimeout(() => act.skipAnimation(), STAGE_MS[stage - 1] + 600);
      return;
    }
    timer = setTimeout(() => run(stage + 1), STAGE_MS[stage - 1]);
  }

  if (reduced) {
    scene.classList.add('is-static');
    setStage(CAPTIONS.length);
    countdown.textContent = '';
  } else {
    run(1);
  }

  return {
    el,
    update() {},
    destroy() {
      clearTimeout(timer);
      clearInterval(countdownTimer);
    },
  };
}
