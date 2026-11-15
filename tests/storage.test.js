import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, SAMPLE_SELECTION } from './helpers.js';
import {
  approveLaunch,
  createInitialState,
  finishSimulation,
  goTo,
  selectOrbit,
  startNewMission,
  togglePayload,
  tryAgain,
} from '../src/core/game-state.js';
import {
  AUDIO_PREFS_KEY,
  DEFAULT_AUDIO_PREFS,
  SAVE_KEY,
  clearSave,
  loadAudioPrefs,
  loadState,
  saveAudioPrefs,
  saveState,
  serializeState,
} from '../src/core/storage.js';

const data = loadData();

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    map,
  };
}

const planned = () => ({ ...startNewMission(data), ...SAMPLE_SELECTION, screen: 'review' });

describe('game state', () => {
  it('starts at the menu with no seed and no result', () => {
    const s = createInitialState(data);
    assert.equal(s.screen, 'menu');
    assert.equal(s.phase, 'planning');
    assert.equal(s.seed, null);
    assert.equal(s.simulationResult, null);
  });

  it('toggles payloads and records choices immutably', () => {
    const a = startNewMission(data);
    const b = togglePayload(a, 'lidar');
    assert.deepEqual(a.payloadIds, []);
    assert.deepEqual(b.payloadIds, ['lidar']);
    assert.deepEqual(togglePayload(b, 'lidar').payloadIds, []);
    assert.equal(selectOrbit(a, 'leo').orbitId, 'leo');
  });

  it('refuses to launch with blockers and keeps the same state', () => {
    const s = { ...planned(), payloadIds: [] };
    assert.equal(approveLaunch(s, data, 123), s);
  });

  it('launch freezes the configuration: seed set, result present, planning locked', () => {
    const launched = approveLaunch(planned(), data, 123);
    assert.equal(launched.phase, 'launched');
    assert.equal(launched.seed, 123);
    assert.equal(launched.screen, 'animation');
    assert.equal(launched.simulationResult.timeline.length, 24);
    assert.equal(goTo(launched, 'payload'), launched);
    assert.equal(togglePayload(launched, 'lidar'), launched);
    assert.equal(finishSimulation(launched).phase, 'debrief');
  });

  it('try again discards the result and the seed and reopens planning', () => {
    const debrief = finishSimulation(approveLaunch(planned(), data, 123));
    const again = tryAgain(debrief);
    assert.equal(again.phase, 'planning');
    assert.equal(again.seed, null);
    assert.equal(again.simulationResult, null);
    assert.deepEqual(again.payloadIds, SAMPLE_SELECTION.payloadIds);
    assert.equal(goTo(again, 'payload').screen, 'payload');
  });
});

describe('storage', () => {
  it('round-trips a planning state', () => {
    const storage = memoryStorage();
    const state = planned();
    assert.equal(saveState(storage, state), true);
    const { state: loaded } = loadState(storage, data);
    assert.deepEqual(loaded, { ...state, seed: null, simulationResult: null });
  });

  it('saves ids and versions only: no config objects and no simulation result', () => {
    const state = approveLaunch(planned(), data, 99);
    const saved = JSON.parse(serializeState(state));
    assert.ok(!('simulationResult' in saved));
    assert.equal(saved.seed, 99);
    assert.equal(saved.schemaVersion, 1);
    assert.equal(saved.dataVersion, data.game.dataVersion);
    assert.ok(!serializeState(state).includes('massKg'));
  });

  it('re-derives the same simulation result for a launched save', () => {
    const storage = memoryStorage();
    const state = approveLaunch(planned(), data, 4321);
    saveState(storage, state);
    const { state: loaded } = loadState(storage, data);
    assert.deepEqual(loaded.simulationResult, state.simulationResult);
    assert.equal(loaded.seed, 4321);
  });

  it('returns no state when there is no save', () => {
    assert.deepEqual(loadState(memoryStorage(), data), { state: null });
  });

  it('discards a save with an incompatible dataVersion without crashing', () => {
    const storage = memoryStorage();
    saveState(storage, { ...planned(), dataVersion: '0.0.1' });
    const r = loadState(storage, data);
    assert.equal(r.state, null);
    assert.equal(r.discarded, true);
    assert.equal(r.reason, 'dataVersion');
    assert.equal(storage.getItem(SAVE_KEY), null);
  });

  it('discards a save with an incompatible schemaVersion', () => {
    const storage = memoryStorage();
    saveState(storage, { ...planned(), schemaVersion: 999 });
    const r = loadState(storage, data);
    assert.equal(r.discarded, true);
    assert.equal(r.reason, 'schemaVersion');
  });

  it('discards corrupted JSON and saves with unknown ids', () => {
    const bad = memoryStorage({ [SAVE_KEY]: '{not json' });
    assert.equal(loadState(bad, data).discarded, true);
    const unknown = memoryStorage();
    saveState(unknown, { ...planned(), orbitId: 'mars-transfer' });
    assert.equal(loadState(unknown, data).reason, 'unknownIds');
  });

  it('survives a storage that throws (private mode, quota)', () => {
    const broken = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('denied'); },
    };
    assert.equal(saveState(broken, planned()), false);
    assert.deepEqual(loadState(broken, data), { state: null });
  });
});

describe('audio preferences', () => {
  it('default to sound on when nothing is saved', () => {
    assert.deepEqual(loadAudioPrefs(memoryStorage()), DEFAULT_AUDIO_PREFS);
    assert.deepEqual(DEFAULT_AUDIO_PREFS, { music: true, effects: true });
  });

  it('round-trip and survive a new mission (separate key from the save)', () => {
    const storage = memoryStorage();
    assert.equal(saveAudioPrefs(storage, { music: false, effects: true }), true);
    saveState(storage, planned());
    clearSave(storage);
    assert.deepEqual(loadAudioPrefs(storage), { music: false, effects: true });
  });

  it('fall back to the defaults for corrupted or partial values', () => {
    assert.deepEqual(loadAudioPrefs(memoryStorage({ [AUDIO_PREFS_KEY]: '{oops' })), DEFAULT_AUDIO_PREFS);
    assert.deepEqual(loadAudioPrefs(memoryStorage({ [AUDIO_PREFS_KEY]: '"muted"' })), DEFAULT_AUDIO_PREFS);
    assert.deepEqual(loadAudioPrefs(memoryStorage({ [AUDIO_PREFS_KEY]: '{"music":"no","effects":false}' })), { music: true, effects: false });
  });

  it('never throw when storage is unavailable', () => {
    const broken = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('denied'); },
    };
    assert.deepEqual(loadAudioPrefs(broken), DEFAULT_AUDIO_PREFS);
    assert.equal(saveAudioPrefs(broken, { music: false, effects: false }), false);
  });
});
