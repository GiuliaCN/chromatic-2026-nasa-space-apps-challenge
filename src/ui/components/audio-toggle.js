import { h } from '../dom.js';

/**
 * Music and sound-effect switches. Several copies (top bar, main menu) stay in sync through
 * audio.subscribe; call destroy() when the copy is removed. The state is in the label text and
 * in aria-pressed, not only in colour.
 */
export function createAudioToggles({ t, audio }) {
  const buttons = ['music', 'effects'].map((key) => {
    const stateEl = h('span', { class: 'audio-toggle__state' });
    const btn = h('button', { type: 'button', class: 'btn btn--ghost audio-toggle', onClick: () => audio.toggle(key) }, `${t(`audio.${key}`)}: `, stateEl);
    return { key, btn, stateEl };
  });

  function sync(prefs) {
    for (const { key, btn, stateEl } of buttons) {
      btn.setAttribute('aria-pressed', String(prefs[key]));
      stateEl.textContent = prefs[key] ? t('audio.on') : t('audio.off');
    }
  }
  sync(audio.prefs());
  const unsubscribe = audio.subscribe(sync);

  return {
    el: h('div', { class: 'audio-toggles', role: 'group', 'aria-label': t('audio.controls') }, buttons.map((b) => b.btn)),
    destroy: unsubscribe,
  };
}
