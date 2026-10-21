// directions.md — the entry gate. The director's §4 says three directions, different in motion
// language or material, before anything is built. Reading the director cannot be verified; the
// artifact can. `om new` scaffolds this file and `om check` / `om render` refuse a project while it
// is missing, empty, still says TODO, or offers three directions that are really the same one.
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIBRARY = fileURLToPath(new URL('../../references/library/languages/', import.meta.url));
const TODO = /\bTODO\b|\bTBD\b|待填|待补/;
const asked = (body, re) => re.test(body || '');
const value = (body, re) => {
  const m = re.exec(body || '');
  return m ? m[1].trim() : '';
};

const DIR_FIELDS = [
  [/^language\s*[:：]/im, 'Language:'],
  [/^material\s*[:：]/im, 'Material:'],
  [/^palette\s*[:：]/im, 'Palette:'],
  [/^why it fits\s*[:：]/im, 'Why it fits:'],
];

const libraryIds = () => {
  try { return readdirSync(LIBRARY).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)); }
  catch { return []; }
};

function sectionsOf(text) {
  const heads = [...text.matchAll(/^##\s+(.+)$/gm)];
  const out = {};
  for (let i = 0; i < heads.length; i++) {
    const from = heads[i].index + heads[i][0].length;
    const next = heads[i + 1] ? heads[i + 1].index : text.length;
    out[heads[i][1].trim()] = text.slice(from, next).replace(/<!--[\s\S]*?-->/g, '').trim();
  }
  return out;
}

// "cursor-demo — it works" → "cursor-demo"; ids keep their hyphens.
const languageId = (body) => value(body, /^language\s*[:：]\s*(.+)$/im)
  .split(/[—–:：]/)[0].trim().split(/\s+/)[0].toLowerCase();

export function directionsPath(root) {
  return join(root, 'directions.md');
}

export function readDirections(root) {
  const file = directionsPath(root);
  if (!existsSync(file)) return { file, text: null, sections: {} };
  const text = readFileSync(file, 'utf8');
  return { file, text, sections: sectionsOf(text) };
}

export function checkDirections(root) {
  const errors = [];
  const warnings = [];
  const { file, text, sections } = readDirections(root);
  if (text == null) {
    errors.push(`no directions.md — write the three directions first (director.md §4): om directions ${root}`);
    return { errors, warnings, file };
  }
  if (TODO.test(text)) {
    return { errors: ['directions.md still says TODO — replace every hint before the treatment or the build'], warnings, file };
  }

  const request = sections.Request;
  if (request == null) errors.push('directions.md has no "## Request" section');
  else {
    if (!asked(request, /^ask\s*[:：]/im)) errors.push('directions.md: "Request" needs an "Ask:" line');
    if (!asked(request, /^material\s*[:：]/im)) errors.push('directions.md: "Request" needs a "Material:" line');
    if (request.length < 20) errors.push('directions.md: "Request" is empty');
    if (TODO.test(request)) errors.push('directions.md: "Request" still says TODO');
  }

  const chosenBody = sections.Chosen;
  if (chosenBody == null) errors.push('directions.md has no "## Chosen" section');
  const skipped = chosenBody == null ? '' : value(chosenBody, /^skipped\s*[:：]\s*(.+)$/im);
  const chosen = chosenBody == null ? '' : value(chosenBody, /^chosen\s*[:：]\s*(.+)$/im);

  if (chosenBody && TODO.test(chosenBody)) errors.push('directions.md: "Chosen" still says TODO');

  if (skipped) {
    if (skipped.length < 10) errors.push('directions.md: "Skipped:" needs a real reason (the user named the style / the project already has one)');
  } else {
    const blocks = ['A', 'B', 'C'].map((id) => ({ id, body: sections[`Direction ${id}`] }));
    const ids = [];
    for (const { id, body } of blocks) {
      if (body == null) { errors.push(`directions.md has no "## Direction ${id}"`); continue; }
      if (body.length < 40) errors.push(`directions.md: "Direction ${id}" is empty`);
      if (TODO.test(body)) errors.push(`directions.md: "Direction ${id}" still says TODO`);
      for (const [re, label] of DIR_FIELDS) {
        if (!asked(body, re)) errors.push(`directions.md: "Direction ${id}" needs a "${label}" line`);
      }
      if (!asked(body, /^key frame\s*[:：]/im)) warnings.push(`directions.md: "Direction ${id}" has no "Key frame:" — one frame that would sell it`);
      const lang = languageId(body);
      if (lang) ids.push({ id, lang });
      if (lang && libraryIds().length && !libraryIds().includes(lang)) {
        warnings.push(`directions.md: "Direction ${id}" language "${lang}" is not in the library (references/library/README.md)`);
      }
    }
    if (ids.length === 3 && new Set(ids.map((x) => x.lang)).size < 3) {
      errors.push(`directions.md: the three directions share a language (${ids.map((x) => `${x.id}=${x.lang}`).join(', ')}) — they must differ in motion language or material`);
    }
    if (!chosen) errors.push('directions.md: "Chosen" needs a "Chosen: A|B|C" line');
    else if (!/^[ABC]$/i.test(chosen.trim())) errors.push(`directions.md: "Chosen: ${chosen}" must be A, B or C`);
    if (chosen && !asked(chosenBody, /^why\s*[:：]/im)) errors.push('directions.md: "Chosen" needs a "Why:" line');
  }

  return { errors, warnings, file };
}

const SCAFFOLD = (name) => `# Directions — ${name}

The entry gate (director.md §4). Write three directions that differ in **motion language or
material**, not only colour, before the treatment or any code. \`om check\` and \`om render\`
refuse this project until this file is complete. If the user already named a style, or the
project already has one, replace the three blocks with a single \`Skipped:\` line and say why.

## Request
TODO: one line — what was asked for.
Ask: <the user's request in one line>
Material: <code / asset-led / hybrid — what footage, screenshots or data exists>

## Direction A
TODO: replace every <…> hint, then delete this line.
Language: <id from references/library/README.md — the dominant motion language>
Material: <what the film is made of>
Palette: <ground / surface / ink / accent + where the colours come from>
Why it fits: <message shape + personality → this language>
Key frame: <the one frame that would sell it>

## Direction B
TODO: replace every <…> hint, then delete this line.
Language: <a genuinely different language>
Material: <a different material route, if possible>
Palette: <a different colour strategy, not just a hue>
Why it fits: <…>
Key frame: <…>

## Direction C
TODO: replace every <…> hint, then delete this line.
Language: <a third language>
Material: <…>
Palette: <…>
Why it fits: <…>
Key frame: <…>

## Chosen
TODO: choose one, or replace this section with "Skipped: <reason>".
Chosen: <A|B|C>
Why: <why this one beats the other two>
`;

export function scaffoldDirections(root) {
  const file = directionsPath(root);
  if (existsSync(file)) return { file, created: false };
  const name = root.split(/[\\/]/).filter(Boolean).at(-1) || 'film';
  writeFileSync(file, SCAFFOLD(name));
  return { file, created: true };
}

export function reportDirections({ errors, warnings }) {
  const lines = [];
  for (const e of errors) lines.push(`error    directions  ${e}`);
  for (const w of warnings) lines.push(`warning  directions  ${w}`);
  return lines.join('\n');
}
