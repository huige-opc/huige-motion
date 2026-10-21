// Print module: deterministic halftone matrices, dot radius, multiply overprint and misregistration.
// Canvas functions (paper/screen/plate/overprint) are exercised by the print demo still, not here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const rng = (seed) => {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};
globalThis.U = { clamp, lerp: (a, b, p) => a + (b - a) * p, rng };
globalThis.window = {};
globalThis.PAINT = { canvas: () => { throw new Error('canvas is not available in this test'); }, cached: () => { throw new Error('canvas is not available in this test'); } };
createRequire(import.meta.url)('../runtime/clip/lib/print.js');
const P = window.PRINT;

test('print: Bayer 2x2 is the standard matrix, 4x4 has every value once', () => {
  assert.deepEqual(P.bayer(2), [[0, 0.5], [0.75, 0.25]]);
  const m = P.bayer(4).flat().sort((a, b) => a - b);
  assert.deepEqual(m, Array.from({ length: 16 }, (_, i) => i / 16));
  const m8 = P.bayer(8).flat().sort((a, b) => a - b);
  assert.equal(new Set(m8).size, 64);
});

test('print: dot radius is zero at no coverage and monotonic', () => {
  assert.equal(P.dotRadius(0, 8), 0);
  assert.ok(P.dotRadius(0.25, 8) < P.dotRadius(0.5, 8));
  assert.ok(P.dotRadius(0.5, 8) < P.dotRadius(1, 8));
  assert.equal(P.dotRadius(1, 8), 8 * 0.62);
});

test('print: threshold keeps 0 and 1 fully off/on and 0.5 about half', () => {
  let zeros = 0, ones = 0, half = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (P.screenPoint(0, x, y, 1, P.BAYER8)) zeros++;
    if (P.screenPoint(1, x, y, 1, P.BAYER8)) ones++;
    if (P.screenPoint(0.5, x, y, 1, P.BAYER8)) half++;
  }
  assert.equal(zeros, 0);
  assert.equal(ones, 64);
  assert.ok(half >= 24 && half <= 40, `0.5 coverage should be about half, got ${half}/64`);
});

test('print: multiply darkens per channel', () => {
  assert.deepEqual(P.multiply([0.5, 0.25, 1], [0.5, 0.5, 0.5]), [0.25, 0.125, 0.5]);
  assert.deepEqual(P.multiply([2, -1, 0.5], [1, 1, 1]), [1, 0, 0.5]);
});

test('print: misregistration is deterministic and stays inside its amount', () => {
  const a = P.misregOffset(2, 1.5, 7), b = P.misregOffset(2, 1.5, 7), c = P.misregOffset(3, 1.5, 7);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(Math.abs(a.dx) <= 1.5 && Math.abs(a.dy) <= 1.5);
});

test('print: hex parsing and rgba output', () => {
  assert.deepEqual(P.hex('#F3EEE5'), [243, 238, 229]);
  assert.deepEqual(P.hex('#fff'), [255, 255, 255]);
  assert.equal(P.rgb([1, 2, 3], 0.5), 'rgba(1,2,3,0.5)');
});
