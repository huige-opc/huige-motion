# Print separation — colour built by overprinting ink plates

huige-motion already has halftone filters and print-led languages (editorial-collage, art-styles).
This file is the model behind that look: tone is separated into ink plates, each plate is screened at
its own angle, and the image is the product of the plates over paper.

Use it when the film should read as a physical print — riso, screen print, letterpress, engraving.
It is not a colour grade: it changes how colour is *built*, not how it is tinted.

## The model

1. **Paper first.** A base colour, low-frequency mottle, per-pixel tooth, and anisotropic fibre
   (blur the noise hard along one axis and less along the other). Without the fibre it is a flat fill
   with noise on top, and reads as a screen, not paper.
2. **Separate tone into plates.** Three or four ink plates, each a grayscale coverage mask — not a
   colour. A dark/medium/light trio is enough for riso; CMYK for process print.
3. **Screen each plate at its own angle.** For CMYK: K 45°, C 15°, M 75°, Y 0°; for a three-ink riso,
   15° / 45° / 75°. Dot size is a function of coverage. Fine screens must be authored at delivery
   size: a 1080p dot made from a 720p plate is a blurred dot.
4. **Overprint with multiply.** For paper `P` (0–1 per channel), ink colour `Cᵢ` and coverage `aᵢ`:

   ```
   out = P × Πᵢ (1 − aᵢ × (1 − Cᵢ))
   ```

   Magenta over cyan makes blue, yellow over magenta makes red, pink over blue makes purple. The
   intermediate hue is the inks' product, not a blend.
5. **Misregister and absorb.** Offset each plate by 0.5–1.5 px, soften the ink edge slightly, and let
   coverage vary a few per cent. Too much offset reads as a printing accident; none reads as digital.
6. **Plate furniture.** Registration marks, crop marks and a colour bar belong only if the film is
   about the print object. Do not paste them onto every scene.

## In the browser

- One offscreen canvas per plate at delivery resolution; draw the coverage mask, halftone it
  (`CL.halftone` or a threshold matrix), then composite onto the paper base with
  `globalCompositeOperation = 'multiply'` in plate order.
- Translating a plate canvas is the misregistration; no need to redraw its content.
- CSS `multiply` works on gamma-encoded sRGB. It approximates ink well enough for this look; if the
  middle tones go muddy, composite in linear light and convert back.
- Cache the paper field and the screened plates. Re-screening every frame makes the dots crawl.

## Shared module

`runtime/clip/lib/print.js` packages the model for browser use. `om new` copies `runtime/clip/lib` into
every project's `vendor/clip/lib/`; add the script tags when you use them (load order: util → paint → print).

```html
<script src="vendor/clip/lib/util.js"></script>
<script src="vendor/clip/lib/paint.js"></script>
<script src="vendor/clip/lib/print.js"></script>
```

```js
const paper = PRINT.paper(W, H, { base: '#F3EEE5', seed: 11 });
const cyan = PRINT.plate('cyan', W, H, (g) => {
  g.fillStyle = '#fff'; g.beginPath(); g.arc(480, 540, 300, 0, Math.PI * 2); g.fill();
}, { cell: 8, angle: 15 * Math.PI / 180, ink: '#00A6C8' });
const magenta = PRINT.plate('magenta', W, H, (g) => {
  g.fillStyle = '#fff'; g.fillRect(620, 260, 600, 560);
}, { cell: 9, angle: 75 * Math.PI / 180, ink: '#E8467C' });
const page = PRINT.overprint(paper, [
  { canvas: cyan, ...PRINT.misregOffset(0, 1.2, 5) },
  { canvas: magenta, ...PRINT.misregOffset(1, 1.2, 5) },
]);
ctx.drawImage(page, 0, 0);
PRINT.cropMarks(ctx, W, H, { margin: 36 });
PRINT.regMark(ctx, W / 2, H / 2);
PRINT.colorBar(ctx, 60, 60, ['#00A6C8', '#E8467C', '#F2C230', '#14161A']);
```

- `PRINT.paper` and `PRINT.plate` are cached by key (`PAINT.cached`): use a unique key per shape and
  parameter set, and re-screen only when the shape changes.
- `PRINT.screen(mask, opts)` screens any coverage canvas without caching; use it for animated masks
  and cache the result yourself.
- A mask is read by alpha by default: draw white shapes on a transparent canvas. For a white-on-black
  mask pass `source: 'luma'`.
- The pure helpers (`bayer`, `dotRadius`, `screenPoint`, `multiply`, `misregOffset`) are unit-tested in
  `test/print.test.js`; `paper` / `screen` / `overprint` are covered by a browser still.

## Check

- At 100% zoom the dots are crisp and round, not resampled.
- Overprint produces intermediate hues, not flat blends.
- Misregistration is visible but under ~2 px.
- At normal playback, and after encoding, the texture does not shimmer or moiré. High-frequency dots
  and H.264 are not friends — verify on the MP4, not only on the canvas.

## Limits

This is an sRGB approximation, not a colour-managed CMYK pipeline. Do not use it where a brand's
printed colour must match a physical swatch, and do not use it for skin-tone-critical work.

## Provenance

The model is standard halftone and overprint practice. RuiC-motion-reel's print-pipeline documents a
four-plate implementation; this is an independent summary for the browser pipeline.
