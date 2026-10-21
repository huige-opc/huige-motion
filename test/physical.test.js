// Physical colour module: CIE fit, thin-film reflectance, Planck and spectral colours, offline LUT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

globalThis.window = {};
createRequire(import.meta.url)('../runtime/clip/lib/physical.js');
const P = window.PHYSICAL;

test('physical: CIE 1931 fit puts 550 nm in the green lobe and 405 nm in the violet', () => {
  const [x, y, z] = P.cmf(550);
  assert.ok(y > 0.9 && y > x && y > z, `550 nm should be green-dominant, got ${[x, y, z]}`);
  const [x4, , z4] = P.cmf(405);
  assert.ok(z4 > 0.05 && z4 > x4, `405 nm should have a strong z, got ${P.cmf(405)}`);
});

test('physical: thin-film reflectance is bounded and changes with thickness', () => {
  for (const d of [20, 100, 300, 550, 780]) {
    const r = P.thinFilm(550, d);
    assert.ok(r >= 0 && r <= 1, `R(${d}) = ${r}`);
  }
  assert.ok(Math.abs(P.thinFilm(550, 100) - P.thinFilm(550, 300)) > 0.01, 'thickness changes R');
});

test('physical: thin-film colour returns sRGB and the 96-entry LUT is deterministic hex', () => {
  const a = P.thinFilmColour(300), b = P.thinFilmColour(550);
  for (const c of [a, b]) for (const v of c) assert.ok(v >= 0 && v <= 1);
  assert.ok(a[2] > a[0], '300 nm should be blue-violet');
  assert.ok(b[1] > b[0] && b[1] > b[2], '550 nm should be green-yellow');
  const l1 = P.lut(96), l2 = P.lut(96);
  assert.equal(l1.length, 96);
  assert.deepEqual(l1, l2);
  for (const h of l1) assert.match(h, /^#[0-9a-f]{6}$/);
});

test('physical: Planck colour is warm at 3000 K and near neutral at 6500 K', () => {
  const warm = P.planckColour(3000), day = P.planckColour(6500);
  assert.ok(warm[0] > warm[2] + 0.2, `3000 K should be warm, got ${warm}`);
  assert.ok(Math.max(...day) - Math.min(...day) < 0.12, `6500 K should be near neutral, got ${day}`);
  const bar = P.blackbodyLut(12);
  assert.equal(bar.length, 12);
  assert.match(bar[0], /^#[0-9a-f]{6}$/);
});

test('physical: spectral lines land on the expected side of the gamut', () => {
  const violet = P.spectralColour(405), red = P.spectralColour(656);
  assert.ok(violet[2] > violet[0], `405 nm should be violet, got ${violet}`);
  assert.ok(red[0] > 0.9 && red[1] < 0.1, `656 nm should be red, got ${red}`);
  assert.equal(P.DEFAULTS.n, 1.462);
});
