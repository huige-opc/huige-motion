# huige-motion

**Motion graphics, launch films and explainers as editable code — point at the frame to change it.**

MIT-licensed, maintained by huige-opc.
A film is one `index.html` (HTML + GSAP + Canvas/Three.js/SVG), rendered frame by frame in your own
Chrome; no video-generation model, every frame is a function of code and time.

## Install

```sh
npx skills add huige-opc/huige-motion
```

Or clone and link the nested skill into your agent's skills folder:

```sh
git clone https://github.com/huige-opc/huige-motion.git
ln -s "$PWD/huige-motion" ~/.claude/skills/huige-motion
```

The skill itself is the root `SKILL.md`; `bin/om` finds the CLI through `pwd -P`.

## Requirements

- Node 22+
- Chrome / Chromium / Edge (stills, checks and export run in your browser)
- FFmpeg (export and soundtrack)
- Optional: `om samples build` (~55 MB of CC0/CC-BY instrument samples)
- Optional narration: system voice, Kokoro, or your own recording

Run `om doctor` to see what is missing.

## Quick start

```sh
om new my-film                  # new project (blank template by default)
om studio my-film               # browser editor
om check my-film                # pre-render checks
om render my-film               # export to my-film/out/
```

Other commands: `om templates`, `om sound`, `om voice`, `om still`, `om qa`, `om export html`.
The full workflow is in [SKILL.md](SKILL.md).

## What's inside

- 10 starter templates (keynote, finance chart, kinetic type, whiteboard, Vox collage, 3Blue1Brown, Kurzgesagt, talking-head package, …)
- 20 motion languages and the director / rhythm / colour / sound methods
- Live studio, frame comments, word-level narration alignment
- Local Chrome rendering + FFmpeg encoding
- `runtime/clip/lib/print.js` (halftone / plates / overprint) and `physical.js` (CIE / thin-film / Planck colour)

## License

Code and docs: MIT, see [LICENSE](LICENSE). Based on an MIT-licensed upstream project; the original copyright is in LICENSE.
Bundled GSAP, fonts, the huashu-art-motion showcase and the "bean Huashu" character keep their own
licenses; see [THIRD_PARTY.md](THIRD_PARTY.md).
