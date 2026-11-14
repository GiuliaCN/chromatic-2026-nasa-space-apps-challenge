import './styles/tokens.css';
import './styles/global.css';
import './styles/screens.css';

import { loadBundle } from './core/data-loader.js';
import { validateConfig } from './core/config-validator.js';
import { makeTranslator } from './core/i18n.js';
import { createInitialState, createStore } from './core/game-state.js';
import { loadState } from './core/storage.js';
import { createApp } from './ui/app-shell.js';
import { h } from './ui/dom.js';

const root = document.getElementById('app');

// The error screen cannot rely on content.en.json (it may be what failed), so it carries
// its own fallback English text.
function showError(title, body, lines) {
  root.replaceChildren(
    h('main', { class: 'fatal', role: 'alert' },
      h('h1', { text: title }),
      h('p', { text: body }),
      h('ul', null, lines.map((line) => h('li', { text: line }))),
      h('button', { type: 'button', class: 'btn btn--primary', onClick: () => location.reload(), text: 'Reload' })),
  );
}

function getStorage() {
  try {
    const probe = '__chromatic_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { storage: window.localStorage, available: true };
  } catch {
    const mem = new Map();
    return {
      available: false,
      storage: {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => void mem.set(k, String(v)),
        removeItem: (k) => void mem.delete(k),
      },
    };
  }
}

async function boot() {
  root.textContent = 'Loading mission data…';
  let data;
  try {
    data = await loadBundle();
  } catch (e) {
    return showError('The mission data could not be loaded', 'Check your connection and reload the page.', [e.message]);
  }
  const { ok, errors } = validateConfig(data);
  if (!ok) {
    return showError('The mission data is invalid', 'Something is wrong with the game configuration files. Fix the JSON files and reload the page.', errors);
  }

  const t = makeTranslator(data.content);
  const { storage, available } = getStorage();
  const notice = { message: available ? '' : t('screen.menu.storageUnavailable') };
  const loaded = loadState(storage, data);
  if (loaded.discarded) notice.message = t('screen.menu.discardedSave');

  const store = createStore(createInitialState(data));
  createApp({ root, data, t, store, storage, notice });
}

boot().catch((e) => showError('Something went wrong', 'The game hit an unexpected error.', [String(e?.message ?? e)]));
