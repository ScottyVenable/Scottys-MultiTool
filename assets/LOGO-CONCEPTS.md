# Logo Concepts — Scotty Multitool

The app's working name is **Scotty Multitool** but the brand should be **versatile enough to survive a rename**. All concepts below avoid name-locked imagery in favor of flexible marks that work at icon size (16px tray) up to wordmark (200+ px sidebar).

The starter SVG files in this folder (`logo-icon.svg`, `logo.svg`) implement **Concept A**. The other two are described as prompts you can feed to an AI image generator to mock up variants.

---

## Concept A — Wrench + Chevron (implemented)

**Metaphor**: a wrench profile whose shaft resolves into a forward-pointing chevron. Evokes *versatility* (wrench = many jobs), *momentum* (chevron = forward), *command line* (chevron = prompt). Monochrome, uses `currentColor` so it adopts the app theme.

**Variants shipped**:
- `logo-icon.svg` (256×256 square) — glyph only, for favicons, tray, window icon.
- `logo.svg` (560×128 horizontal) — glyph + "Multitool" wordmark + tagline.

**Use in UI**: inline via `<img src="/assets/logo.svg" />` or `<svg>` embed. Because it uses `currentColor`, styling is simply `color: var(--accent)` or `color: var(--text-0)`.

---

## Concept B — Stacked Squares (tiles)

**Metaphor**: four interlocking rounded squares at slightly different sizes, suggesting modular tools snapping together. Reads as a "grid of features" and scales beautifully to a 16-pixel tray icon (the four squares become distinguishable pixels).

**Colors**: the four squares in `--accent`, `--blue`, `--green`, `--yellow` against a neutral background. On dark themes the squares glow slightly; on light themes they have subtle shadows.

---

## Concept C — Orbit Dots

**Metaphor**: a central filled dot with three smaller dots on concentric arcs around it. Suggests orchestration / automation — a core with satellites. Very minimalist; works at any size; doesn't collide with any existing tech brand.

**Colors**: core is `--accent`, satellites graduate from `--accent` (brightest) through `--blue` to `--text-3` (dimmest), creating a sense of depth.

---

## Title Header (in-app)

The sidebar already shows **"Multitool"** in a tight weight-700 sans. When the new logo lands, keep that wordmark and add the glyph to its left at 14px. Character tracking stays at `-0.02em`.

```
┌──────────┬───────────────┐
│  [glyph] │  Multitool    │   ← sidebar header
└──────────┴───────────────┘
```

For the topbar (inside a page), show **only** the current page name — don't repeat the logo. This keeps the app clean: branding appears once, content is king.

---

## Combined Horizontal Lockup

For marketing surfaces (README, splash, landing page):

```
 ╱╲   MULTITOOL
 ╲╱   LOCAL · AUTOMATE · FOCUS
```

The vertical bar in `logo.svg` separates the glyph and wordmark at exactly 12px gutter. On mobile/compact surfaces, drop the tagline and keep glyph + wordmark only.

---

## Rename-Resilience Notes

Every concept above is **name-agnostic**. When the app is eventually renamed:

1. Drop in the new wordmark over the existing glyph.
2. Do not change the glyph itself — it carries the brand.
3. Keep the tagline structure `WORD · WORD · WORD` because it compresses a long tagline into a glanceable rhythm.

---

## AI Image Prompts

Six prompts across three engines. Use these to generate reference variants before committing to a direction.

### MidJourney v6

```
minimalist vector logo, abstract wrench fused with forward chevron, single continuous stroke,
monochrome white on deep charcoal #0d0d0d, thick rounded line work, ~64% negative space,
centered in 1:1 square, ultra clean, Swiss design, flat, no text, no gradients
--s 50 --stylize 80 --no photograph
```

```
four interlocking rounded squares logo mark, concentric sizes, tile grid metaphor,
flat vector, accent orange + cool blue + mint green + warm yellow, charcoal background,
minimalist Swiss modernism, centered, 1:1, no text, generous negative space
--s 50 --stylize 60
```

### DALL·E 3

```
A minimalist vector logo mark of a stylized wrench whose handle resolves into a
forward-pointing chevron. Single continuous line, rounded terminals, thick stroke,
pure white on dark charcoal background. 1:1 square. No text, no shading, no gradient,
no photographic elements. Centered with generous padding. Ultra-modern, Swiss design.
```

```
Orbit-dots icon: a central solid disc with three smaller discs arranged on two
concentric elliptical arcs around it, as if in orbit. Flat vector style,
monochrome white on deep charcoal. 1:1 square. No text. Crisp, minimal, tech-brand feel.
```

### Stable Diffusion XL

```
(minimalist vector logo:1.3), abstract wrench silhouette merging into forward chevron,
single continuous stroke, bold rounded line work, monochrome, transparent background,
Swiss design, flat, no text, no photograph, (centered:1.2), square aspect,
(negative space:1.1), ultra clean.
Negative: photograph, 3d, shading, gradient, text, lettering, complex details, noise.
CFG 6, steps 28, sampler DPM++ 2M Karras
```

```
(four interlocking rounded squares:1.3), modular grid, tile metaphor, concentric sizes,
flat vector logo, accent orange, cool blue, mint green, warm yellow, transparent background,
(minimalist:1.2), Swiss modernism, centered, square, no text.
Negative: photograph, 3d, text, noise, shading, gradient.
CFG 6, steps 28, sampler DPM++ 2M Karras
```

---

## Color Tokens (for any concept)

When rendering these in the app, use theme variables so users' accent preferences are respected:

| Token | Hex (dark) | Usage |
|-------|-----------|-------|
| `--accent` | `#ff6b35` | Primary (user-themed) |
| `--text-0` | `#f5f5f5` | Logo on dark surfaces |
| `--bg-0`   | `#0d0d0d` | Background |
| `--blue`   | `#4a9eff` | Secondary accent |
| `--green`  | `#5fcf5f` | Tertiary |
| `--yellow` | `#ffd84a` | Quaternary |

When exporting for distribution, render white-on-transparent **and** a separate black-on-transparent version so the asset works on any future surface.
