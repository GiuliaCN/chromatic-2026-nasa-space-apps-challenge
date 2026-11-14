// Consistent unit formatting: kg, W, Wh, GB, GB/month, $M, pts.

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const num = (v) => nf0.format(v);
export const num1 = (v) => nf1.format(v);

export const kg = (v) => `${num(v)} kg`;
export const watts = (v) => `${num(v)} W`;
export const wh = (v) => `${num(v)} Wh`;
export const gb = (v) => `${num(v)} GB`;
export const gbMonth = (v) => `${num(v)} GB/month`;
export const money = (v) => `$${num1(v)}M`;
export const moneyInt = (v) => `$${num(v)}M`;
export const pts = (v) => `${num1(v)} pts`;
export const percent = (ratio) => `${num(ratio * 100)}%`;
export const signed = (v, unit = '') => `${v >= 0 ? '+' : '−'}${num(Math.abs(v))}${unit}`;
