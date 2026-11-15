// Background music and sound effects. Presentation only: it never reads or changes game state,
// and every failure (autoplay blocked, missing file, offline) is silent, so sound can never break
// a mission. Files, volumes and the music of each screen come from audio.json.

const FADE_STEP_MS = 50;
const INTERACTIVE = 'button, a[href]';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function createAudio({ config, prefs, onChange }) {
  const base = import.meta.env?.BASE_URL ?? './';
  const url = (src) => new URL(`${base}${src}`, document.baseURI).href;
  const state = { ...prefs };
  const listeners = new Set();

  // ---- music ----------------------------------------------------------------------------------
  const tracks = new Map(config.music.map((m) => [m.id, m]));
  const players = new Map(); // track id -> <audio>, created on first use and kept to resume later
  const fades = new Map(); // <audio> -> interval id
  let wanted = null; // track the current screen asks for
  let unlocked = false; // true once the browser has let any sound play

  function player(id) {
    if (!players.has(id)) {
      const el = new Audio(url(tracks.get(id).src));
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      players.set(id, el);
    }
    return players.get(id);
  }

  function fadeTo(el, target, then) {
    clearInterval(fades.get(el));
    const steps = Math.max(1, Math.round(config.musicFadeMs / FADE_STEP_MS));
    const delta = (target - el.volume) / steps;
    let n = 0;
    fades.set(el, setInterval(() => {
      n += 1;
      el.volume = n >= steps ? target : clamp01(el.volume + delta);
      if (n < steps) return;
      clearInterval(fades.get(el));
      fades.delete(el);
      then?.();
    }, FADE_STEP_MS));
  }

  const audibleTrack = () => (state.music && !document.hidden ? wanted : null);

  function syncMusic() {
    const id = audibleTrack();
    for (const [pid, el] of players) {
      if (pid === id || el.paused) continue;
      if (document.hidden) el.pause(); // background tabs throttle timers: stop at once
      else fadeTo(el, 0, () => el.pause());
    }
    if (!id) return;
    const el = player(id);
    const volume = tracks.get(id).volume;
    if (!el.paused) {
      fadeTo(el, volume);
      return;
    }
    // Browsers block play() until the first click or key press; the gesture listener retries.
    el.play()
      .then(() => {
        unlocked = true;
        if (audibleTrack() === id) fadeTo(el, volume);
        else el.pause();
      })
      .catch(() => {});
  }

  const onGesture = () => {
    if (!unlocked) syncMusic();
  };
  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('keydown', onGesture, true);
  document.addEventListener('visibilitychange', syncMusic);

  // ---- effects --------------------------------------------------------------------------------
  // One element per effect: replaying restarts it instead of stacking copies.
  const effects = new Map(config.effects.map((e) => [e.id, e]));
  const sounds = new Map();
  let count = 0;

  function sound(id) {
    if (!sounds.has(id)) {
      const el = new Audio(url(effects.get(id).src));
      el.preload = 'auto';
      el.volume = effects.get(id).volume;
      sounds.set(id, el);
    }
    return sounds.get(id);
  }
  if (state.effects) for (const id of effects.keys()) sound(id); // preload: the first click is not late

  function effect(id) {
    count += 1;
    if (!state.effects || !effects.has(id)) return;
    const el = sound(id);
    el.currentTime = 0;
    el.play().then(() => { unlocked = true; }).catch(() => {});
  }

  function stop(id) {
    const el = sounds.get(id);
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }

  // ---- preferences ----------------------------------------------------------------------------
  function toggle(key) {
    state[key] = !state[key];
    if (key === 'music') syncMusic();
    if (key === 'effects' && !state.effects) for (const el of sounds.values()) el.pause();
    onChange?.({ ...state });
    for (const l of listeners) l({ ...state });
  }

  return {
    prefs: () => ({ ...state }),
    toggle,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    setScreen(screen) {
      const id = config.musicByScreen[screen] ?? null;
      if (id === wanted) return;
      wanted = id;
      syncMusic();
    },
    effect,
    stop,
    /** Grows on every effect request; lets the click sound step aside for a more specific one. */
    effectCount: () => count,
  };
}

/**
 * Click and hover sounds for every button and link, by event delegation, so screens need no
 * audio code for them. When the click already triggered a more specific sound (advice, countdown...),
 * the plain click is skipped.
 */
export function attachUiSounds(audio, target = document) {
  let mark = 0;
  let hovered = null;
  target.addEventListener('click', () => { mark = audio.effectCount(); }, true);
  target.addEventListener('click', (e) => {
    if (audio.effectCount() === mark && e.target.closest?.(INTERACTIVE)) audio.effect('click');
  });
  target.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.(INTERACTIVE) ?? null;
    if (el === hovered) return;
    hovered = el;
    if (el && !el.disabled) audio.effect('hover');
  });
}
