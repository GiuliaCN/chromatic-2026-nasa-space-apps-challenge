// Usage: npm run validate:data
// Validates every JSON file in public/data and prints readable errors.
import { loadRaw } from '../tests/helpers.js';
import { createBundle } from '../src/core/data-loader.js';
import { validateConfig } from '../src/core/config-validator.js';

let raw;
try {
  raw = loadRaw();
} catch (e) {
  console.error(`Could not read the data files: ${e.message}`);
  process.exit(1);
}
const { ok, errors } = validateConfig(createBundle(raw));
if (ok) {
  console.log('Data files are valid.');
} else {
  console.error(`Found ${errors.length} problem(s):`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
