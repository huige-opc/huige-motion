# Physical colour — when the colour is computed, not sampled

[colour.md](colour.md) says: find colours, do not invent them. This file is the one exception with a
reason. When the film is about a physical phenomenon, the colour can be derived from the phenomenon
itself, so the number on screen and the colour beside it are the same fact.

Use it only when all three hold:

- the subject is physical (a temperature, a wavelength, a film thickness, an exposure);
- the film can state the quantity on screen;
- the colour carries meaning, rather than decorating a frame.

Otherwise use colour.md. A computed colour is not a palette: the film still needs a ground, ink and an
accent, and those still come from the product.

## Three chains worth building

### 1. Blackbody temperature → CIE 1931 → sRGB

Spectral radiance at wavelength λ for temperature T:

```
B(λ, T) = (2hc² / λ⁵) / (exp(hc / (λkT)) − 1)
```

Integrate `B(λ, T)` against the CIE 1931 2° colour-matching functions `x̄(λ), ȳ(λ), z̄(λ)` (1 nm or
5 nm table), normalise so `Y = 1`, convert XYZ → linear sRGB with the standard matrix, then apply the
sRGB transfer function. Clip negatives (out of gamut) and normalise; a 2000 K source is orange, 6500 K
is near white, 12000 K is blue. The useful move is a temperature *scale* on screen, not one pretty
amber.

### 2. A spectral line → colour

A single wavelength maps to a point on the spectral locus: H-alpha at 656.28 nm red, 405 nm violet.
Monochromatic colours are mostly outside sRGB, so they clip and lose luminance. Use them as a beam,
a line, a glow or a dot — not as a large flat fill — and keep the plate neutral so the line is the
only saturated thing.

### 3. Thin-film interference → colour

For a film of thickness `d` and refractive index `n` on a substrate, reflectance at normal incidence:

```
δ  = 2π n d / λ
r₁ = (n₀ − n) / (n₀ + n)        r₂ = (n − nₛ) / (n + nₛ)
R(λ) = | (r₁ + r₂ e^(−2iδ)) / (1 + r₁ r₂ e^(−2iδ)) |²
```

Integrate `R(λ)` against the same colour-matching functions → XYZ → sRGB. For SiO₂ on Si
(`n ≈ 1.462`), one interference order is `Δd = λ / 2n ≈ 188 nm` at 550 nm, so a 20–780 nm thickness
sweep passes through several rainbow orders. Real stacks have dispersion and absorption; this is a
plausible physical model, not a measurement.

## Use it without slowing the film down

- Precompute a small LUT offline (Node or Python) and bake the hex values into CSS variables or a JS
  array. Never integrate per frame.
- State the input next to the colour: `405 nm`, `3000 K`, `SiO₂ 320 nm`. If the film says 405 nm, the
  hex must be the 405 nm value.
- Put the computed colour on a measured neutral ground. The point is that the colour is exact, not
  that the frame is saturated.
- Desaturate a still and check the hierarchy still reads; spectral colours clip hard.

## Shared module

`runtime/clip/lib/physical.js` is the same chain as browser code, with no canvas dependency:

```html
<script src="vendor/clip/lib/physical.js"></script>
```

```js
PHYSICAL.cmf(nm)                        // CIE 1931 2° [x,y,z] (Wyman 2013 fit)
PHYSICAL.thinFilm(nm, dNm, { n, ns })   // reflectance R
PHYSICAL.thinFilmColour(dNm, { mode })  // sRGB 0..1; 'max' = display, 'y' = physical luminance
PHYSICAL.planckColour(T, { mode })      // blackbody → sRGB
PHYSICAL.spectralColour(nm, { width })  // one spectral line → sRGB (clips; use as a line/glow)
PHYSICAL.lut(n, d0, d1, { format })     // hex (or rgb) array — call once, then only index it
PHYSICAL.blackbodyLut(n, t0, t1)        // temperature bar
```

```js
const LUT = PHYSICAL.lut(96, 20, 780);       // one call, then never integrate again
const hex = LUT[Math.round((d - 20) / 760 * 95)];
```

Defaults are `n = 1.462` (SiO₂) and `ns = 3.5` (Si). `mode: 'max'` keeps the hue and normalises the
brightest channel so every ring is readable; `mode: 'y'` keeps physical luminance and is usually dark.
Say which one the film uses, and put the input number (`550 nm`, `3000 K`) beside the colour.
`test/physical.test.js` covers the CIE fit, reflectance bounds, Planck warmth and spectral sides.

## Check

- The quantity on screen and the colour come from the same source.
- The colour sits where it means something (a beam, a wafer, a temperature scale), not on a wash.
- With the colour removed, the frame still reads as a composition.

## Provenance

The chains are standard colorimetry: Planck's law, the CIE 1931 2° observer, Airy summation for the
film stack. The LITHO reference film (RuiC-motion-reel) used 405 nm and 20–780 nm SiO₂ as inputs; its
on-screen numbers are the inputs, not decoration.
