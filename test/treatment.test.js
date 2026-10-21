// treatment.md is the plan the film is built from. The gate exists because reading the director cannot
// be verified — the artifacts it produces can. These tests are the bad example and the good example.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkTreatment, scaffoldTreatment, treatmentPath } from '../cli/lib/treatment.js';

const root = () => mkdtempSync(join(tmpdir(), 'om-treatment-'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const stills = (dir, ts) => ts.forEach((t) => writeFileSync(join(dir, `index-${t.toFixed(2)}s.png`), PNG));

const VALID = `# Treatment — test film

## Direction
Language: kinetic-type — scale slam, mask reveal
Palette: ground #F3EEE4 70 · surface #DCE2DA 15 · ink #15201B · accent #2F6BFF 5 — from: site CSS
Why it fits: claim + precise → kinetic-type carries the sentence

## Rhythm
Route: hybrid
Hook (within 3 s): the word slams in on the first hit
Burst (30–60 %): six cuts on eighths at 34 s
Hero moment: the number reveals on the drop at 52 s
Events per bar: hook 3 · build 2 · peak 6 · resolve 1
BPM: 120 · duration 60 s

## Key frames
- 0.4 s — hook: the word at full frame
- 18 s — hero: the counter lands
- 34 s — densest: six cards on the beat
- 59 s — end card: the mark

## Continuity chain
word → counter: the same blue dot carries the eye
counter → grid: the dot multiplies into six cards

## Departure from the house style
Paper ground with a hand-cut collage instead of cream with one warm accent.
`;

test('no file: the gate stops the project', () => {
  const r = checkTreatment(root());
  assert.ok(r.errors.some((e) => /no treatment\.md/.test(e)));
});

test('scaffold writes the five sections and still fails on TODO', () => {
  const dir = root();
  assert.equal(scaffoldTreatment(dir).created, true);
  assert.match(readFileSync(treatmentPath(dir), 'utf8'), /## Departure from the house style/);
  assert.equal(scaffoldTreatment(dir).created, false, 'never overwrites');
  const r = checkTreatment(dir);
  assert.ok(r.errors.some((e) => /TODO/.test(e)));
});

test('a complete treatment passes once the four key frames exist', () => {
  const dir = root();
  writeFileSync(treatmentPath(dir), VALID);
  stills(dir, [0.4, 18, 34, 59]);
  const r = checkTreatment(dir);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test('a complete treatment without its key frames is still an error', () => {
  const dir = root();
  writeFileSync(treatmentPath(dir), VALID);
  const r = checkTreatment(dir);
  assert.ok(r.errors.some((e) => /no still at 0\.4, 18, 34, 59/.test(e)));
});

test('an empty section or fewer than four key frames is an error', () => {
  const dir = root();
  writeFileSync(treatmentPath(dir), VALID.replace(/## Rhythm[\s\S]*?(?=## Key frames)/, '## Rhythm\n\n')
    .replace('- 59 s — end card: the mark\n', ''));
  const r = checkTreatment(dir);
  assert.ok(r.errors.some((e) => /"Rhythm" is empty/.test(e)));
  assert.ok(r.errors.some((e) => /fewer than four/.test(e)));
});
