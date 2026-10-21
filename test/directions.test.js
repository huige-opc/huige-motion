// directions.md is the entry gate: three directions, different in motion language or material,
// before the treatment or any code. These tests are the bad example and the good example.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDirections, directionsPath, scaffoldDirections } from '../cli/lib/directions.js';

const root = () => mkdtempSync(join(tmpdir(), 'om-directions-'));

const VALID = `# Directions — test film

## Request
Ask: a 30 s launch for a photo-to-card tool
Material: asset-led — four real cards and one portrait clip

## Direction A
Language: cursor-demo — product UI
Material: asset-led
Palette: paper #F6F5F2 / ink #1B1A17 / accent #D9480F — from site CSS
Why it fits: it works; show the player
Key frame: the preview with the first real card

## Direction B
Language: card-montage — finished cards
Material: asset-led
Palette: cream / sage / coral — from the cards
Why it fits: step by step, finished and real
Key frame: the seven-card grid

## Direction C
Language: kinetic-type — the claim
Material: code
Palette: paper / orange
Why it fits: a claim with conviction
Key frame: the full-frame line

## Chosen
Chosen: A
Why: the product is a player, so the UI is the proof
`;

test('no file: the entry gate stops the project', () => {
  const r = checkDirections(root());
  assert.ok(r.errors.some((e) => /no directions\.md/.test(e)));
});

test('scaffold writes the sections and still fails on TODO', () => {
  const dir = root();
  assert.equal(scaffoldDirections(dir).created, true);
  const text = readFileSync(directionsPath(dir), 'utf8');
  assert.match(text, /## Request/);
  assert.match(text, /## Direction A/);
  assert.match(text, /## Chosen/);
  assert.equal(scaffoldDirections(dir).created, false, 'never overwrites');
  assert.ok(checkDirections(dir).errors.some((e) => /TODO/.test(e)));
});

test('three genuinely different directions pass', () => {
  const dir = root();
  writeFileSync(directionsPath(dir), VALID);
  assert.deepEqual(checkDirections(dir).errors, []);
});

test('three directions with one language do not pass', () => {
  const dir = root();
  writeFileSync(directionsPath(dir), VALID.replace('Language: card-montage — finished cards', 'Language: cursor-demo — same thing again'));
  assert.ok(checkDirections(dir).errors.some((e) => /share a language/.test(e)));
});

test('Chosen must name A, B or C', () => {
  const dir = root();
  writeFileSync(directionsPath(dir), VALID.replace('Chosen: A', 'Chosen: Z'));
  assert.ok(checkDirections(dir).errors.some((e) => /must be A, B or C/.test(e)));
});

test('the library path is real: a known id is quiet, an unknown id warns', () => {
  const dir = root();
  writeFileSync(directionsPath(dir), VALID);
  assert.equal(checkDirections(dir).warnings.some((w) => /is not in the library/.test(w)), false);
  writeFileSync(directionsPath(dir), VALID.replace('Language: card-montage — finished cards', 'Language: not-a-language — made up'));
  assert.ok(checkDirections(dir).warnings.some((w) => /not-a-language.*not in the library/.test(w)));
});

test('a named style is a valid skip', () => {
  const dir = root();
  writeFileSync(directionsPath(dir), `# Directions — test film

## Request
Ask: a 30 s launch, the user asked for kinetic-type
Material: code

## Chosen
Skipped: the user named kinetic-type in the brief
`);
  assert.deepEqual(checkDirections(dir).errors, []);
});
