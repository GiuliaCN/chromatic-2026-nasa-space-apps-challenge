// Loads the game JSON files and builds an indexed, read-only data bundle.
// URLs are resolved against the page (document.baseURI) and Vite's BASE_URL, so the
// game works at a domain root and under a GitHub Pages sub-path.

export const DATA_FILES = {
  game: 'game.json',
  content: 'content.en.json',
  goals: 'science-goals.json',
  orbits: 'orbits.json',
  payloads: 'payloads.json',
  spacecraft: 'spacecraft.json',
  launchers: 'launchers.json',
  events: 'events.json',
};

function indexById(list) {
  const map = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    if (item && typeof item === 'object' && typeof item.id === 'string') map.set(item.id, item);
  }
  return map;
}

/**
 * Build the bundle from already-parsed JSON documents. Pure; used by the browser loader,
 * the data validation script and the tests. Missing sections become empty lists so the
 * validator can report them instead of crashing here.
 */
export function createBundle(raw) {
  const spacecraft = raw.spacecraft ?? {};
  const bundle = {
    game: raw.game ?? {},
    content: raw.content ?? {},
    goals: raw.goals?.goals ?? [],
    orbits: raw.orbits?.orbits ?? [],
    payloads: raw.payloads?.payloads ?? [],
    buses: spacecraft.buses ?? [],
    powers: spacecraft.powers ?? [],
    comms: spacecraft.comms ?? [],
    launchers: raw.launchers?.launchers ?? [],
    events: raw.events?.events ?? [],
  };
  bundle.byId = {
    goals: indexById(bundle.goals),
    orbits: indexById(bundle.orbits),
    payloads: indexById(bundle.payloads),
    buses: indexById(bundle.buses),
    powers: indexById(bundle.powers),
    comms: indexById(bundle.comms),
    launchers: indexById(bundle.launchers),
    events: indexById(bundle.events),
  };
  return bundle;
}

function dataUrl(file) {
  const base = import.meta.env?.BASE_URL ?? './';
  return new URL(`${base}data/${file}`, document.baseURI).href;
}

/** Fetch every JSON file in parallel. Throws an Error with a friendly message on failure. */
export async function loadRawData(fetchImpl = fetch, urlOf = dataUrl) {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, file]) => {
      let response;
      try {
        // Revalidate so a new deploy is picked up; if the network is down, fall back to whatever
        // the browser already has cached (lets a previously loaded game start offline).
        try {
          response = await fetchImpl(urlOf(file), { cache: 'no-cache' });
        } catch {
          response = await fetchImpl(urlOf(file), { cache: 'force-cache' });
        }
      } catch (err) {
        throw new Error(`Could not download ${file} (${err.message}).`);
      }
      if (!response.ok) throw new Error(`Could not download ${file} (HTTP ${response.status}).`);
      try {
        return [key, await response.json()];
      } catch {
        throw new Error(`${file} is not valid JSON.`);
      }
    }),
  );
  return Object.fromEntries(entries);
}

export async function loadBundle(fetchImpl, urlOf) {
  return createBundle(await loadRawData(fetchImpl, urlOf));
}
