---
name: Combust
description: Fuel-mileage tracker in the "Ember" world: soft lavender-grey paper, round white surfaces, and one flame accent kept to small marks.
colors:
  flame: "#ff6b3d"
  flame-2: "#ffb347"
  flame-text: "#c4410f"
  ink: "#1d1630"
  daylight-background: "#f3f1f7"
  daylight-card: "#ffffff"
  field: "#e9e4f4"
  daylight-muted-foreground: "#675f7c"
  daylight-border: "#e5e1ee"
  pip-off: "#e2deeb"
  destructive: "#b3261e"
  night-background: "#130f1a"
  night-card: "#1c1626"
  night-field: "#2a2038"
  night-foreground: "#f1edf8"
  night-muted-foreground: "#a79fbc"
  night-flame: "#ff7a4d"
typography:
  display-numeral:
    fontFamily: "Bricolage Grotesque Variable, system-ui, sans-serif"
    fontSize: "clamp(76px, 22vw, 96px)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Onest Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  card: "28px"
  hero: "32px"
  row: "20px"
  pill: "9999px"
components:
  button-flame:
    backgroundColor: "{colors.flame}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "42px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.daylight-background}"
    rounded: "{rounded.pill}"
    height: "40px"
  card:
    backgroundColor: "{colors.daylight-card}"
    rounded: "{rounded.card}"
---

# Design System: Combust

## Overview

**Creative North Star: "Ember"**

Calm, round and a little warm. Surfaces are soft and pill-shaped; the only fire in the interface lives in small marks: the best fill-up, the heat pips beside each mileage, the add button. Two themes ship: daylight (lavender-grey paper, white cards) and night (aubergine-black, same flame).

## Colors

- **Flame** (#ff6b3d; night #ff7a4d) and **Flame 2** (#ffb347): add button, best-fill pill (gradient), above-average dots and pips, focus ring, brand mark. Never a large surface.
- **Field** (#e9e4f4; night #2a2038): the one tinted region per screen (the hero), and avatar chips.
- **Ink** (#1d1630): primary buttons, active nav pill, text. In night the primary flips to near-white.
- **Verdict colours:** best = flame, above average = amber (flame-2), below average = muted grey-violet. Used for pills, dots and pips only, with `sectorOf` in `src/lib/sector.ts`.

### Named Rules
**The Small Flame Rule.** Flame appears only as small marks or the single add action; never as a panel fill.
**The One Field Rule.** One tinted field slab per screen (the Overview hero); everything else is white card on paper.

## Typography

Bricolage Grotesque (display, 700/800, tight tracking) for numerals, titles and figures; Onest for everything else. Figures are tabular. Hero numeral caps at 96px.

## Layout

Sticky header (brand, pill nav, import/settings, Add entry) over a 1080px content column. Below md a floating pill tab bar with a round flame add button replaces the header nav. Overview: hero field (numeral and sentence, pill chart), four fact cards, recent fill-ups card.

## Elevation & Depth

Soft diffuse card shadow in daylight (`0 1px 2px / 0 8px 24px -12px` violet-ink), a 1px hairline in night. Floating bars and overlays use the float shadow.

## Shapes

Cards 28px, hero 32px, rows 20px, everything interactive is a pill. Chart marks are fully round pills.

## Components

- **Fill-up row:** 44px round station chip, name and meta, mileage numeral with five heat pips (pip count = distance from average; best is always full).
- **Mileage chart:** one white pill per fill-up on the field; best pill is flame gradient; dot at the top says above or below average.
- **Buttons:** pill; `flame` for the primary create action, ink `default` elsewhere, `card` for quiet header actions.
