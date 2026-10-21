// treatment.md — the plan the film is built from (director.md §5). Reading the director cannot be
// verified; the artifacts reading produces can. `om new` scaffolds this file, and `om check` /
// `om render` refuse a project while it is missing, empty or still says TODO. Existing projects get
// the same message and a one-line scaffold command — the gate never silently passes.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const isPng = (file) => {
  try { return readFileSync(file).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); }
  catch { return false; }
};

const SECTIONS = [
  {
    name: 'Direction',
    re: /^##\s+(Direction|方向(?:卡)?)\s*$/im,
    fields: [[/language\s*[:：]/i, 'Language:'], [/palette\s*[:：]/i, 'Palette:'], [/why it fits\s*[:：]/i, 'Why it fits:']],
    min: 60,
  },
  {
    name: 'Rhythm',
    re: /^##\s+(Rhythm|节奏(?:单)?)\s*$/im,
    fields: [
      [/route\s*[:：]/i, 'Route:'],
      [/hook\b[^:\n]*[:：]/i, 'Hook:'],
      [/burst\b[^:\n]*[:：]/i, 'Burst:'],
      [/events per bar\s*[:：]/i, 'Events per bar:'],
    ],
    min: 60,
  },
  { name: 'Key frames', re: /^##\s+(Key frames|关键帧)\s*$/im, min: 20 },
  { name: 'Continuity chain', re: /^##\s+(Continuity chain|连贯链|衔接链)\s*$/im, min: 20 },
  {
    name: 'Departure from the house style',
    re: /^##\s+(Departure(?: from the house style)?|风格偏离|避开房子风格)\s*$/im,
    min: 20,
  },
];

const TODO = /\bTODO\b|\bTBD\b|待填|待补/;
const times = (body) => [...body.matchAll(/(\d{1,3}(?:\.\d+)?)\s*(?:s\b|秒)/g)].map((m) => Number(m[1]));

export function treatmentPath(root) {
  return join(root, 'treatment.md');
}

// Parse the file without enforcing anything: each section's heading and body, plus the times it names.
export function readTreatment(root) {
  const file = treatmentPath(root);
  if (!existsSync(file)) return { file, text: null, sections: {}, times: [] };
  const text = readFileSync(file, 'utf8');
  const sections = {};
  for (const s of SECTIONS) {
    const m = s.re.exec(text);
    if (!m) continue;
    const from = m.index + m[0].length;
    const next = text.indexOf('\n## ', from);
    const body = text.slice(from, next === -1 ? text.length : next).replace(/<!--[\s\S]*?-->/g, '').trim();
    sections[s.name] = body;
  }
  const keyBody = sections['Key frames'] || '';
  const found = [...new Set(times(keyBody))];
  return { file, text, sections, times: found };
}

export function checkTreatment(root) {
  const errors = [];
  const warnings = [];
  const { file, text, sections, times: frameTimes } = readTreatment(root);
  if (text == null) {
    errors.push(`no treatment.md — write the film's plan first (director.md §5): om treatment ${root}`);
    return { errors, warnings, file };
  }
  for (const s of SECTIONS) {
    const body = sections[s.name];
    if (body == null) { errors.push(`treatment.md has no "## ${s.name}" section`); continue; }
    if (body.length < s.min) errors.push(`treatment.md: "${s.name}" is empty`);
    if (TODO.test(body)) errors.push(`treatment.md: "${s.name}" still says TODO`);
    for (const [re, label] of s.fields || []) if (!re.test(body)) errors.push(`treatment.md: "${s.name}" needs a "${label}" line`);
  }
  if (frameTimes.length < 4) errors.push('treatment.md: "Key frames" names fewer than four times (hook, hero, densest, end)');
  const missing = frameTimes.filter((t) => ![`index-${t.toFixed(2)}s.png`, `index-${t}s.png`].some((n) => isPng(join(root, n))));
  if (missing.length) errors.push(`no still at ${missing.join(', ')} s — render the key frames and look at them before building: om still ${root} --at ${missing.join(',')}`);
  return { errors, warnings, file };
}

const SCAFFOLD = (name) => `# Treatment — ${name}

The plan the film is built from (references/director.md §5). \`om check\` and \`om render\` refuse this
project until every section is filled and every TODO is gone. Replace the hints with real decisions;
keep the headings and the labels — the gate reads them.

## Direction
TODO: replace every <…> hint in this section, then delete this line.
Language: <id from library/README.md> — <the two or three techniques it uses>
Palette: ground #RRGGBB · surface #RRGGBB · ink #RRGGBB · accent #RRGGBB — from: <site CSS / screenshot / product finish>
Why it fits: <message shape + personality sentence → this direction>

## Rhythm
TODO: replace every <…> hint in this section, then delete this line.
Route: <continuous / montage / hybrid>
Hook (within 3 s): <what lands, on the cut or the sound>
Burst (30–60 %): <the dense stretch: 5–8 cuts or slams>
Hero moment: <the reveal, and the musical point it sits on>
Events per bar: hook <n> · build <n> · peak <n> · resolve <n>
BPM: <n> · duration <n> s

## Key frames
TODO: replace every <…> hint in this section, then delete this line.
Four moments to render and look at before building (\`om still <dir> --at …\`):
- 0.4 s — hook frame: <what it must show>
- <n> s — hero moment: <what it must show>
- <n> s — densest frame: <what it must show>
- <n> s — end card: <what it must show>

## Continuity chain
TODO: replace every <…> hint in this section, then delete this line.
<shot 1 → shot 2>: <what carries the eye — object, colour or shape>
<shot 2 → shot 3>: <…>

## Departure from the house style
TODO: replace every <…> hint in this section, then delete this line.
<one line: how this look differs from the cream/near-black, one-warm-accent, Geist house look (library/README.md)>
`;

export function scaffoldTreatment(root) {
  const file = treatmentPath(root);
  if (existsSync(file)) return { file, created: false };
  const name = root.split(/[\\/]/).filter(Boolean).at(-1) || 'film';
  writeFileSync(file, SCAFFOLD(name));
  return { file, created: true };
}

export function reportTreatment({ errors, warnings }) {
  const lines = [];
  for (const e of errors) lines.push(`error    treatment  ${e}`);
  for (const w of warnings) lines.push(`warning  treatment  ${w}`);
  return lines.join('\n');
}
