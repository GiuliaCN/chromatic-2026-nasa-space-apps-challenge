import { h } from '../dom.js';
import { createSpacecraftSvg } from '../components/spacecraft-svg.js';
import { createEarthLimbSvg } from '../components/earth-svg.js';
import { createAudioToggles } from '../components/audio-toggle.js';

export function mountMainMenu(ctx) {
  const { t, data, act, dialogs, audio } = ctx;

  const showcase = createSpacecraftSvg({ t, vivid: true });
  const pick = (list, i) => list[Math.min(i, list.length - 1)];
  showcase.update({
    bus: pick(data.buses, 1),
    power: pick(data.powers, 1),
    comm: pick(data.comms, 1),
    payloads: data.payloads.slice(0, 3),
  });
  const earth = createEarthLimbSvg({ vivid: true });

  const newBtn = h('button', { type: 'button', class: 'btn btn--hero btn--primary', onClick: act.newMission }, h('span', { class: 'btn__glyph', 'aria-hidden': 'true', text: '▶' }), t('screen.menu.newMission'));
  const continueBtn = h('button', { type: 'button', class: 'btn btn--hero', onClick: act.continueMission }, h('span', { class: 'btn__glyph', 'aria-hidden': 'true', text: '▤' }), t('screen.menu.continueMission'));
  const howBtn = h('button', { type: 'button', class: 'btn btn--hero', onClick: () => dialogs.howTo() }, h('span', { class: 'btn__glyph', 'aria-hidden': 'true', text: '?' }), t('screen.menu.howToPlay'));
  const noticeEl = h('p', { class: 'menu__notice', role: 'status' });
  const soundToggles = createAudioToggles({ t, audio });
  const creditsBtn = h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => dialogs.credits(data.audio.credits), text: t('audio.credits') });

  const el = h(
    'section',
    { class: 'screen screen--menu', 'aria-labelledby': 'menu-title' },
    h('div', { class: 'menu__sky' }, earth.el),
    h('div', { class: 'menu__satellite' }, showcase.el),
    h(
      'div',
      { class: 'menu__content' },
      h('div', { class: 'menu__brand' },
        h('img', { class: 'menu__logo', src: `${import.meta.env?.BASE_URL ?? './'}logo.jpeg`, alt: t('app.logoAlt'), width: 168, height: 168 }),
        h('div', null,
          h('p', { class: 'menu__eyebrow', text: t('app.title') }),
          h('h1', { class: 'menu__title', id: 'menu-title', text: t('app.subtitle') }),
          h('p', { class: 'menu__tagline', text: t('app.tagline') }))),
      h('p', { class: 'menu__intro', text: t('app.intro') }),
      noticeEl,
      h('nav', { class: 'menu__buttons', 'aria-label': t('app.title') }, newBtn, continueBtn, howBtn),
      h('div', { class: 'menu__sound' }, soundToggles.el, creditsBtn),
      h('p', { class: 'menu__disclaimer', text: t('app.disclaimer') }),
    ),
  );

  return {
    el,
    update() {
      const saved = ctx.hasSave();
      continueBtn.disabled = !saved;
      continueBtn.title = saved ? '' : t('screen.menu.continueMission');
      noticeEl.textContent = ctx.notice.message ?? '';
      noticeEl.hidden = !ctx.notice.message;
    },
    destroy: soundToggles.destroy,
  };
}
