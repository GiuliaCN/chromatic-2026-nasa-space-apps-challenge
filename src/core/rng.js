// Seeded PRNG (mulberry32). Same seed => same sequence, so simulations are reproducible.

export function createRng(seed) {
  let state = (Number(seed) >>> 0) || 0x9e3779b9; // avoid the all-zero state
  return {
    /** Float in [0, 1). */
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Fresh seed for a new launch. Lives outside the simulation so the simulation stays pure. */
export function generateSeed() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
  }
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}
