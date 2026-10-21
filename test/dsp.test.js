import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATE, TAU, bp, filt, hp, lp, tapeWow } from '../cli/lib/dsp.js';

const sine = (f, sec) => { const n = Math.round(sec * RATE), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = Math.sin((TAU * f * i) / RATE); return o; };
const rms = (x, a, b) => { let e = 0; for (let i = a; i < b; i++) e += x[i] * x[i]; return Math.sqrt(e / (b - a)); };

test('filt with a flat response reconstructs the signal', () => {
  const x = sine(440, 0.5);
  const y = filt(x, () => 1);
  assert.equal(y.length, x.length);
  assert.equal(y[0], 0); // the window sum is zero there, so output is silence, not noise
  let worst = 0;
  for (let i = 2048; i < x.length - 2048; i++) worst = Math.max(worst, Math.abs(y[i] - x[i]));
  assert.ok(worst < 1e-3, `worst reconstruction error ${worst}`);
});

test('lp removes a tone well above the cutoff', () => {
  const x = sine(8000, 0.5);
  const y = filt(x, lp(500));
  const before = rms(x, 4096, x.length - 4096);
  const after = rms(y, 4096, y.length - 4096);
  assert.ok(after < before * 0.05, `8 kHz tone survived: ${after} of ${before}`);
});

test('a sweeping cutoff opens the filter over time', () => {
  const x = sine(6000, 0.6);
  const cutoff = (t) => 200 * Math.pow(60, Math.min(1, t / 0.6));
  const y = filt(x, (f, t) => lp(cutoff(t))(f), { block: 1024 });
  const early = rms(y, 2048, 6000);
  const late = rms(y, 20000, 26000);
  assert.ok(late > early * 4, `sweep did not open: early ${early}, late ${late}`);
});

test('lp / hp / bp are 0.5 at their cutoff', () => {
  assert.ok(Math.abs(lp(1000)(1000) - 0.5) < 1e-9);
  assert.ok(Math.abs(hp(1000)(1000) - 0.5) < 1e-9);
  assert.ok(Math.abs(bp(100, 8000)(100) - 0.5) < 1e-3);
  assert.ok(Math.abs(bp(100, 8000)(8000) - 0.5) < 1e-3);
});

test('filt rejects a block that is not a power of two', () => {
  assert.throws(() => filt(sine(440, 0.1), () => 1, { block: 3000 }), /power of two/);
});

test('tapeWow with zero depth is the same signal', () => {
  const x = sine(440, 0.2);
  const y = tapeWow(x, { depth: 0 });
  assert.equal(y.length, x.length);
  for (let i = 0; i < x.length; i++) assert.equal(y[i], x[i]);
});

test('tapeWow drifts deterministically and stays finite', () => {
  const x = sine(440, 0.5);
  const a = tapeWow(x, { depth: 0.0022, rate: 0.7 });
  const b = tapeWow(x, { depth: 0.0022, rate: 0.7 });
  let differs = 0, peak = 0;
  for (let i = 0; i < x.length; i++) {
    assert.ok(Number.isFinite(a[i]));
    assert.equal(a[i], b[i]);
    if (Math.abs(a[i] - x[i]) > 1e-4) differs++;
    peak = Math.max(peak, Math.abs(a[i]));
  }
  assert.ok(differs > x.length * 0.1, `only ${differs} samples drifted`);
  assert.ok(peak <= 1.001);
});
