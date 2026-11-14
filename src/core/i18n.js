// Pure text helpers. Content lives in content.en.json (nested objects, dotted keys).

/** Resolve a dotted key to a raw value (string, array, object) or undefined. */
export function lookup(content, key) {
  if (typeof key !== 'string' || !content) return undefined;
  let node = content;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return undefined;
    node = node[part];
  }
  return node;
}

/** Replace {name} placeholders with params. Unknown placeholders are left visible. */
export function interpolate(text, params = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, name) =>
    name in params && params[name] !== undefined ? String(params[name]) : m,
  );
}

/** Translate a key. Missing keys render as a visible marker instead of throwing. */
export function translate(content, key, params) {
  const value = lookup(content, key);
  if (typeof value !== 'string') return `[${key}]`;
  return interpolate(value, params);
}

/** Translate a key that holds a list of strings. */
export function translateList(content, key, params) {
  const value = lookup(content, key);
  if (!Array.isArray(value)) return [];
  return value.map((v) => interpolate(v, params));
}

export function makeTranslator(content) {
  const t = (key, params) => translate(content, key, params);
  t.list = (key, params) => translateList(content, key, params);
  t.has = (key) => lookup(content, key) !== undefined;
  t.raw = (key) => lookup(content, key);
  return t;
}
