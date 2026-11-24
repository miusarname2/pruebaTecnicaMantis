---
name: "Site Viewer Studio"
description: "Architectural CAD and 3D digital twin design system built on warm drafting paper, carbon ink, and signal vermilion."
---

## Overview

Site Viewer Studio is a precision interface for architects, surveyors, and construction project leads inspecting 3D digital twins and laser point-cloud scans. It rejects glowing dark-mode clichés in favor of a tactile, drafting-table aesthetic: warm architectural paper in light mode, deep graphite charcoal in dark mode, crisp 1px structural hairlines, and monospace telemetry.

## Colors

The palette pairs **Signal Vermilion** (`primary`) for active inspection tools and primary actions with **Blueprint Slate** (`secondary`) for structural selections and level filters. Neutral surfaces draw from warm drafting paper in light mode and carbon-slate in dark mode, avoiding pure `#000000` halation.

- **Primary:** Signal Vermilion marks active 3D selections, primary CTAs, and focus states.
- **Secondary:** Blueprint Slate anchors level filters, spatial axes, and secondary controls.
- **Status (`success`):** Forest Moss communicates verified delivery milestones without neon saturation.

```yaml
colors:
  success: "#2E6F40"
  on-success: "#FFFFFF"
  success-container: "#D3F0D9"
  on-success-container: "#143D20"
  grid-line-light: "#E2DDD4"
  grid-line-dark: "#2A2823"
  light:
    primary: "#AB2E07"
    on-primary: "#FFFFFF"
    primary-container: "#CE4621"
    on-primary-container: "#FFFBFF"
    secondary: "#33628B"
    on-secondary: "#FFFFFF"
    secondary-container: "#E8F1FF"
    on-secondary-container: "#154A72"
    tertiary: "#006191"
    on-tertiary: "#FFFFFF"
    error: "#BA1A1A"
    on-error: "#FFFFFF"
    error-container: "#FFDAD6"
    on-error-container: "#93000A"
    background: "#FEF9F0"
    on-background: "#1D1C16"
    surface: "#FEF9F0"
    surface-dim: "#DED9D1"
    surface-bright: "#FFFFFF"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#F8F3EA"
    surface-container: "#F2EDE5"
    surface-container-high: "#EDE8DF"
    surface-container-highest: "#E7E2D9"
    on-surface: "#1D1C16"
    surface-variant: "#EDE8DF"
    on-surface-variant: "#615E58"
    outline: "#7A7770"
    outline-variant: "#CAC6BE"
    inverse-surface: "#32302B"
    inverse-on-surface: "#F5F0E7"
  dark:
    primary: "#F4613A"
    on-primary: "#2A0400"
    primary-container: "#AF300A"
    on-primary-container: "#FFEDE9"
    secondary: "#82AFDD"
    on-secondary: "#001D33"
    secondary-container: "#154A72"
    on-secondary-container: "#CFE5FF"
    tertiary: "#8FCDFF"
    on-tertiary: "#00344F"
    error: "#FFB4AB"
    on-error: "#690005"
    error-container: "#93000A"
    on-error-container: "#FFDAD6"
    background: "#15130F"
    on-background: "#E7E2D9"
    surface: "#15130F"
    surface-dim: "#0F0E0A"
    surface-bright: "#2C2A24"
    surface-container-lowest: "#0F0E0A"
    surface-container-low: "#1D1C16"
    surface-container: "#21201A"
    surface-container-high: "#2C2A24"
    surface-container-highest: "#36352F"
    on-surface: "#E7E2D9"
    surface-variant: "#2C2A24"
    on-surface-variant: "#AFABA3"
    outline: "#949089"
    outline-variant: "#494740"
    inverse-surface: "#E7E2D9"
    inverse-on-surface: "#32302B"
```

## Typography

Typography pairs **Archivo** for structural headers and project titles with **Reddit Sans** for clean UI controls and **Source Code Pro** for coordinates, project IDs, dimensions, and milestone dates. All numeric readouts use `tabular-nums`.

```yaml
typography:
  display-md:
    fontFamily: "Archivo"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 44px
    letterSpacing: -0.75px
  display-md-mobile:
    fontFamily: "Archivo"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 36px
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: "Archivo"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 30px
    letterSpacing: -0.3px
  headline-md:
    fontFamily: "Archivo"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: -0.2px
  title-md:
    fontFamily: "Archivo"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  body-md:
    fontFamily: "Reddit Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Reddit Sans"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Reddit Sans"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 18px
    letterSpacing: 0px
  label-sm:
    fontFamily: "Reddit Sans"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.4px
  mono-sm:
    fontFamily: "Source Code Pro"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
```

## Layout & Spacing

The workspace uses a full-viewport CAD shell: a compact 52px top utility bar, a fluid 3D drafting canvas on the left, and a fixed 360px inspector rail on the right. The authentication screen uses an asymmetric 50/50 split on desktop, collapsing to a single centered column on smaller viewports. Spacing adheres strictly to a 4px/8px architectural grid.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 24px
  section: 32px
  page-margin: 24px
```

## Elevation & Depth

Hierarchy is established through **tonal surface steps** (`surface` → `surface-container-low` → `surface-container-lowest`) and **crisp 1px hairline borders** (`outline-variant`), rather than drop shadows or frosted-glass blurs. Floating viewport toolbars use a solid opaque surface with a 1px structural border so 3D geometry remains legible behind them without `backdrop-blur`.

## Shapes

Corners are intentionally tight and technical—reflecting CAD software rather than consumer social apps. Buttons, inputs, and inspector panels use `4px` to `6px` radii; status badges and segmented toggles use `4px`; full pills are reserved only for compact zoom/orbit hints if needed.

```yaml
rounded:
  sm: 2px
  DEFAULT: 4px
  md: 6px
  lg: 8px
  full: 9999px
```

## Motion & Micro-interaction

Motion is crisp, mechanical, and restrained. Hover states, theme switches, and 3D volume selections respond within 120ms using an ease-out curve. Nothing pulses, bounces, or loops decoratively, and `prefers-reduced-motion` is respected.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  panel-transition:
    duration: 180ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
```

## Voice & Content Strategy

Interface copy is direct, technical, and unembellished.
- **Tone:** Matter-of-fact, engineering-grade, concise. No marketing buzzwords.
- **Capitalisation:** Sentence case for buttons, headings, and empty states; uppercase only for compact technical metadata labels (`CLIENT`, `LEVELS`, `PTS1`).
- **Actions:** Verb-object labels (`Load point cloud`, `Report an issue`, `Sign in to workspace`).
- **Numbers & Dates:** `tabular-nums` everywhere; dates formatted `Mar 2, 2026`; dimensions in metric (`m²`, `m`).

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Badge** → `@components/badge.html` — `badge-numeric`, `badge-dot`
- **Button** → `@components/button.html` — `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html` — `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Input Field** → `@components/input-field.html` — `input-field-text`, `input-field-icon`
