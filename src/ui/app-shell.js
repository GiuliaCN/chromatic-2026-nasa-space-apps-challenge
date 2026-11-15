// Application shell: header, stepper, footer and screen switching. Subscribes to the store and
// persists state. Screens receive `ctx` and never touch storage or the engine directly.

import { h, clear } from './dom.js';
import {
  approveLaunch,
  finishSimulation,
  goTo,
  selectBus,
  selectComm,
  selectGoal,
  selectLauncher,
  selectOrbit,
  selectPower,
  selectionOf,
  startNewMission,
  togglePayload,
  tryAgain,
} from '../core/game-state.js';
import { resolveSelection } from '../core/calculations.js';
import { validateDesign } from '../core/validation.js';
import { generateSeed } from '../core/rng.js';
import { clearSave, hasSave, loadAudioPrefs, loadState, saveAudioPrefs, saveState } from '../core/storage.js';
import { createDialogs } from './components/help-drawer.js';
import { createAudioToggles } from './components/audio-toggle.js';
import { attachUiSounds, createAudio } from './audio.js';
import { CHROME, isPlanning, nextScreen, prevScreen, stepComplete } from './navigation.js';
import { createStepIcon } from './icons.js';

import { mountMainMenu } from './screens/main-menu.js';
import { mountBriefing } from './screens/briefing.js';
import { mountOrbitSelection } from './screens/orbit-selection.js';
import { mountPayloadDesign } from './screens/payload-design.js';
import { mountSpacecraftDesign } from './screens/spacecraft-design.js';
import { mountLaunchPlanning } from './screens/launch-planning.js';
import { mountMissionReview } from './screens/mission-review.js';
import { mountLaunchAnimation } from './screens/launch-animation.js';
import { mountMissionSimulation } from './screens/mission-simulation.js';
import { mountMissionDebrief } from './screens/mission-debrief.js';

const SCREENS = {
  menu: mountMainMenu,
  briefing: mountBriefing,
  orbit: mountOrbitSelection,
  payload: mountPayloadDesign,
  spacecraft: mountSpacecraftDesign,
  launch: mountLaunchPlanning,
  review: mountMissionReview,
  animation: mountLaunchAnimation,
  simulation: mountMissionSimulation,
  debrief: mountMissionDebrief,
};

export function createApp({ root, data, t, store, storage, notice }) {
  const audio = createAudio({ config: data.audio, prefs: loadAudioPrefs(storage), onChange: (prefs) => saveAudioPrefs(storage, prefs) });
  attachUiSounds(audio);
  const dialogs = createDialogs({ t, audio });

  // ---- derived values (memoised per state object) -------------------------------------------
  let memo = { state: null, value: null };
  function derive(state) {
    if (memo.state === state) return memo.value;
    const selection = selectionOf(state);
    const check = validateDesign(data, selection);
    memo = { state, value: { selection, check, indicators: check.indicators, items: resolveSelection(data, selection) } };
    return memo.value;
  }

  // ---- actions ------------------------------------------------------------------------------
  const update = (fn) => store.update(fn);
  const act = {
    goto: (screen) => update((s) => goTo(s, screen)),
    next: () => update((s) => (nextScreen(s.screen) ? goTo(s, nextScreen(s.screen)) : s)),
    back: () => update((s) => goTo(s, prevScreen(s.screen))),
    selectGoal: (id) => update((s) => selectGoal(s, id)),
    selectOrbit: (id) => update((s) => selectOrbit(s, id)),
    togglePayload: (id) => update((s) => togglePayload(s, id)),
    selectPower: (id) => update((s) => selectPower(s, id)),
    selectComm: (id) => update((s) => selectComm(s, id)),
    selectBus: (id) => update((s) => selectBus(s, id)),
    selectLauncher: (id) => update((s) => selectLauncher(s, id)),
    approve: () => update((s) => approveLaunch(s, data, generateSeed())),
    finishSimulation: () => update((s) => finishSimulation(s)),
    skipAnimation: () => update((s) => (s.screen === 'animation' ? goTo(s, 'simulation') : s)),
    tryAgain: () => update((s) => tryAgain(s)),
    toMenu: () => update((s) => goTo(s, 'menu')),
    newMission() {
      const start = () => {
        clearSave(storage);
        update(() => startNewMission(data));
      };
      if (hasSave(storage)) {
        dialogs.confirm({
          heading: t('screen.menu.confirmNewTitle'),
          text: t('screen.menu.confirmNewBody'),
          yes: t('screen.menu.confirmNewYes'),
          no: t('screen.menu.confirmNewNo'),
          onYes: start,
        });
      } else {
        start();
      }
    },
    continueMission() {
      const result = loadState(storage, data);
      if (result.state) update(() => result.state);
    },
  };

  const ctx = { data, t, store, act, dialogs, audio, derive, storage, hasSave: () => hasSave(storage), notice };

  // ---- chrome -------------------------------------------------------------------------------
  const logo = h('img', { class: 'logo', src: `${import.meta.env?.BASE_URL ?? './'}logo.jpeg`, alt: t('app.logoAlt'), width: 96, height: 96 });
  const titleEl = h('h1', { class: 'topbar__title' });
  const subtitleEl = h('p', { class: 'topbar__subtitle' });
  const progressEl = h('div', { class: 'progress', 'aria-live': 'polite' });
  const whyBtn = h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => dialogs.help(store.getState().screen), text: t('nav.why') });
  const glossBtn = h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => dialogs.glossary(), text: t('nav.glossary') });
  const menuBtn = h('button', { type: 'button', class: 'btn btn--ghost', onClick: act.toMenu, text: t('nav.menu') });
  const soundToggles = createAudioToggles({ t, audio });
  const topbar = h(
    'header',
    { class: 'topbar' },
    logo,
    h('div', { class: 'topbar__titles' }, titleEl, subtitleEl),
    h('div', { class: 'topbar__right' }, progressEl, h('div', { class: 'topbar__tools' }, whyBtn, glossBtn, menuBtn, soundToggles.el)),
  );

  const stepperList = h('ol', { class: 'stepper__list' });
  const stepper = h('nav', { class: 'stepper', 'aria-label': t('steps.progress') }, stepperList);

  const screenHost = h('main', { class: 'screen-host', id: 'main', tabindex: '-1' });

  const backBtn = h('button', { type: 'button', class: 'btn btn--nav', onClick: act.back }, h('span', { 'aria-hidden': 'true', text: '‹ ' }), t('nav.back'));
  const nextBtn = h('button', { type: 'button', class: 'btn btn--nav btn--primary', onClick: act.next }, t('nav.next'), h('span', { 'aria-hidden': 'true', text: ' ›' }));
  const messageEl = h('p', { class: 'footer__message' });
  const footer = h('footer', { class: 'footer' }, backBtn, messageEl, nextBtn);

  const skipLink = h('a', { class: 'skip-link', href: '#main', text: t('nav.skipToContent') });
  const frame = h('div', { class: 'frame' }, topbar, stepper, screenHost, footer);
  const appEl = h('div', { class: 'app' }, skipLink, frame);
  clear(root).append(appEl);

  const stepEls = data.game.planningSteps.map((step, i) => {
    const mark = h('span', { class: 'step__mark', 'aria-hidden': 'true' });
    const li = h('li', { class: 'step' }, h('span', { class: 'step__icon' }, createStepIcon(step.id)), h('span', { class: 'step__label', text: t(step.labelKey) }), mark);
    stepperList.append(li);
    return { li, mark, step, index: i };
  });

  // ---- rendering ----------------------------------------------------------------------------
  let current = { screen: null, view: null };

  function renderChrome(state) {
    const chrome = CHROME[state.screen] ?? CHROME.menu;
    appEl.dataset.screen = state.screen;
    appEl.classList.toggle('app--menu', state.screen === 'menu');
    appEl.classList.toggle('app--space', ['animation', 'simulation', 'debrief'].includes(state.screen));
    topbar.hidden = !chrome.topbar;
    stepper.hidden = !chrome.stepper;
    footer.hidden = chrome.footer === 'none';

    titleEl.textContent = t(`screen.${state.screen}.title`);
    subtitleEl.textContent = t(`screen.${state.screen}.subtitle`);
    messageEl.textContent = t(`screen.${state.screen}.footer`);

    const idx = data.game.planningSteps.findIndex((s) => s.id === state.screen);
    const total = data.game.planningSteps.length;
    progressEl.replaceChildren(
      h('span', { class: 'progress__label', text: t('steps.progress') }),
      h('strong', { class: 'progress__value', text: idx >= 0 ? t('steps.stageOf', { current: idx + 1, total }) : t(`screen.${state.screen}.title`) }),
    );

    for (const { li, mark, step, index } of stepEls) {
      const done = idx >= 0 ? index < idx : isPlanning(state.screen) === false;
      const active = index === idx;
      li.className = `step${done ? ' is-done' : ''}${active ? ' is-active' : ''}`;
      mark.textContent = done ? '✓' : String(index + 1);
      if (active) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      li.dataset.step = step.id;
    }

    const planning = isPlanning(state.screen);
    backBtn.hidden = !(chrome.footer === 'nav' || chrome.footer === 'back');
    nextBtn.hidden = chrome.footer !== 'nav';
    const complete = stepComplete(state.screen, state);
    nextBtn.disabled = !complete;
    nextBtn.title = complete ? '' : t(`screen.${state.screen}.pickFirst`) ;
    whyBtn.hidden = false;
    menuBtn.hidden = state.screen === 'menu';
    void planning;
  }

  function render(state) {
    renderChrome(state);
    audio.setScreen(state.screen);
    if (current.screen !== state.screen) {
      current.view?.destroy?.();
      current = { screen: state.screen, view: SCREENS[state.screen](ctx) };
      clear(screenHost).append(current.view.el);
      screenHost.scrollTop = 0;
      window.scrollTo?.(0, 0);
      screenHost.focus({ preventScroll: true });
    }
    current.view.update(state, derive(state));
  }

  store.subscribe((state) => {
    if (state.screen !== 'menu') saveState(storage, state);
    render(state);
  });
  render(store.getState());

  return { act, ctx };
}
