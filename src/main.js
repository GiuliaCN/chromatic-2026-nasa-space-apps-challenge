import { loadBundle } from './core/data-loader.js';
import { validateConfig } from './core/config-validator.js';

const root = document.getElementById('app');

function showError(title, lines) {
  root.replaceChildren();
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  const h = document.createElement('h1');
  h.textContent = title;
  const ul = document.createElement('ul');
  for (const line of lines) {
    const li = document.createElement('li');
    li.textContent = line;
    ul.append(li);
  }
  box.append(h, ul);
  root.append(box);
}

async function boot() {
  let data;
  try {
    data = await loadBundle();
  } catch (e) {
    return showError('The mission data could not be loaded', [e.message]);
  }
  const { ok, errors } = validateConfig(data);
  if (!ok) return showError('The mission data is invalid', errors);
  root.textContent = 'Chromatic data loaded.';
}

boot();
