---
name: Combust
description: Fuel-mileage tracker styled as a motorsport timing board, with a lime brand field, ink rail and purple/green/amber sector colours.
colors:
  lime: "#c6ff1a"
  lime-foreground: "#0b0b0c"
  ink: "#0d0d0e"
  rail: "#0b0b0c"
  rail-foreground: "#f2f4ea"
  daylight-background: "#eceee4"
  daylight-card: "#ffffff"
  daylight-muted: "#e2e5d6"
  daylight-muted-foreground: "#5d6056"
  daylight-border: "#d9dccf"
  daylight-input: "#c7cbb9"
  accent-soft-lime: "#dff07e"
  sector-best: "#7b2fe0"
  sector-up: "#0f9e45"
  sector-down: "#a87500"
  bar-best: "#8a3ff5"
  bar-up: "#19c25a"
  bar-down: "#f2b705"
  destructive: "#c9301c"
  warning-band: "#fff1c2"
  warning-band-foreground: "#5c4200"
  night-background: "#09090a"
  night-card: "#141416"
  night-popover: "#1a1a1d"
  night-muted: "#1f1f23"
  night-muted-foreground: "#9a9d92"
  night-border: "#26262a"
  night-input: "#34343a"
  night-foreground: "#f3f4ee"
  night-sector-best: "#b77bff"
  night-sector-up: "#3be07a"
  night-sector-down: "#ffd23f"
  night-destructive: "#ff6a55"
typography:
  display-numeral:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(76px, 22vw, 96px)"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "48px"
    fontWeight: 900
    lineHeight: 0.9
  panel-title:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "25px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.025em"
  row-figure:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
  body:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
  caption:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "9.6px"
  md: "12.8px"
  lg: "16px"
  xl: "22.4px"
  card: "20px"
  hero: "22px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.daylight-background}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.sector-best}"
    textColor: "#ffffff"
  button-lime:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.lime-foreground}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.daylight-card}"
    rounded: "{rounded.card}"
    padding: "16px"
  input:
    backgroundColor: "{colors.daylight-card}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 14px"
  rail-item-active:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.lime-foreground}"
    rounded: "{rounded.md}"
    height: "44px"
  badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.daylight-background}"
    rounded: "{rounded.pill}"
    height: "24px"
---

# Design System: Combust

## Overview

**Creative North Star: "The Timing Board"**

Combust reads fuel mileage the way a pit wall reads lap times: one loud headline figure, then a tower of rows where colour carries the verdict. Lime is the brand field and the only saturated surface; ink (near-black) is the rail and the primary action; purple, green and amber are reserved for sector meaning (best, above average, below average mileage). Two themes ship: daylight (warm grey-green paper, white cards) and pit lane night (near-black, lime becomes the primary action).

Density is moderate and figure-led. Big Shoulders Display condensed numerals do the shouting; Hanken Grotesk at bold weights carries everything else. All figures are tabular so columns align.

**Key Characteristics:**
- Lime hero slab (22px radius) holds the average-mileage figure; everything else sits on cards.
- Sector colour is semantic only: best/up/down. It appears as text, bar fills and the 6px row chip.
- Desktop gets an ink pit-wall rail; mobile gets an ink bottom tab bar with a raised lime add button.
- Pill buttons, 20px cards, flat surfaces with hairline borders.

## Colors

A lime-and-ink brand field with three semantic sector colours on warm neutral paper (daylight) or near-black (night).

### Primary
- **Pit Lime** (#c6ff1a): hero slab background, active rail item, add button, selection highlight, avatar/vehicle chip, primary in dark theme.
- **Ink** (#0d0d0e): primary buttons, badges and text in daylight; also the rail (#0b0b0c).

### Secondary (sector colours)
- **Best Purple** (#7b2fe0; night #b77bff; bar fill #8a3ff5): best fill-up, focus ring in daylight, primary-button hover.
- **Above-Average Green** (#0f9e45; night #3be07a; bar #19c25a): mileage at or above average.
- **Below-Average Amber** (#a87500 as text; night #ffd23f; bar #f2b705): mileage below average.

### Neutral
- **Daylight Paper** (#eceee4) page; **Card White** (#ffffff); **Muted Sage** (#e2e5d6) secondary fills; **Muted Text** (#5d6056); **Hairline** (#d9dccf) borders; **Input Stroke** (#c7cbb9).
- **Night Asphalt** (#09090a) page, **Night Card** (#141416), popover (#1a1a1d), border (#26262a), input (#34343a), text (#f3f4ee), muted text (#9a9d92).
- **Soft Lime** (#dff07e; night #232d07): accent fills. **Warning Band** (#fff1c2 / night #2b2200): caution banners. **Destructive** (#c9301c; night #ff6a55).

### Named Rules
**The Sector Meaning Rule.** Purple, green and amber mean best, above average, below average mileage, via `sectorOf` in `src/lib/sector.ts`. Do not use them as decoration.
**The One Field Rule.** Lime is the only saturated surface colour; a screen has one lime slab, plus small lime markers (active nav, add button).

## Typography

**Display Font:** Big Shoulders Display (700/800/900; fallback Arial Narrow, sans-serif)
**Body Font:** Hanken Grotesk Variable (fallback system-ui, sans-serif). No monospace; figures use tabular numerals on body.

**Character:** A condensed racing-board display face against a friendly, sturdy grotesk.

### Hierarchy
- **Display numeral** (900, clamp(76px, 22vw, 96px), 0.82): average mileage on the hero.
- **Headline** (900, 48-60px, 0.9, uppercase): empty-state heading.
- **Panel title** (800, 25px, 1, +0.025em, uppercase): panel and card titles (CardTitle is 20px).
- **Row figure** (800, 30px; station code 900 at 26px, +0.05em): mileage and station code in fill-up rows; hero stats 32px.
- **Body** (700 for labels/names, 15px; 400 for secondary at 13px): rows, buttons are 14px bold.
- **Caption** (600, 10-12.5px): chart dates, bar values, legends.

### Named Rules
**The Figures Line Up Rule.** Body is `font-variant-numeric: tabular-nums` globally; numbers never use proportional figures.

## Layout

Desktop (md and up): a 208px sticky ink rail on the left, content column max 1024px (max-w-5xl) with 28px padding. Below md: single column, 16px padding, 112px bottom padding for the fixed tab bar. Overview stacks the lime hero, then at lg a two-column grid (1.15fr chart panel, 1fr recent fill-ups). Rhythm is 16px gap on mobile, 20px from md. Hero stats are a 2-up grid on mobile, 4-up with divider rules from sm.

## Elevation & Depth

Flat by default. Cards rely on a 1px border plus `0 1px 0 rgba(13,13,14,0.04)` in daylight and no shadow at night. A single floating shadow `0 18px 40px -18px rgba(13,13,14,0.45)` (night: rgba(0,0,0,0.8)) is for overlays. Depth otherwise comes from tonal contrast: ink rail vs paper, lime slab vs white cards.

## Shapes

Round and soft against condensed type: pill buttons and badges (full), 20px cards and panels, 22px hero slab, 12-16px inputs and nav items, 3px bar/legend chips with 6px top radius on chart bars. The brand mark is a lime checkered square.

## Components

### Buttons
- **Shape:** pill (9999px), 40px default, 32px sm, 48px lg; 14px bold.
- **Primary:** ink fill, paper text; in night, lime fill with ink text. Hover turns purple (daylight) or dims (night).
- **Lime:** lime fill, ink text, brightness dip on hover. **Outline/Secondary/Ghost:** input stroke or Muted Sage fills. **Destructive:** 10% tint with destructive text.
- **Focus:** 3px ring at 50% of the ring colour (purple in daylight, lime at night).

### Cards / Containers
- 20px radius, 1px hairline border, white (night #141416), 16px padding (20px from md).

### Inputs / Fields
- 44px tall, 12.8px radius, card-coloured fill, input-stroke border; focus swaps border to ring colour with 3px ring; invalid uses destructive border and ring.

### Navigation
- Rail: 44px items, 12.8px radius, bold 15px; active = lime fill with ink text, idle #a7aa9f, hover #1b1b1d. Brand: checkered square plus COMBUST in Big Shoulders 900.
- Tab bar: ink, five-column grid, active label and icon lime, idle #9a9d92, centre 58px lime circular add button raised 28px with a 4px page-coloured ring.

### Fill-up Row (signature)
Timing-tower row: 6px sector chip, 3-letter station code (display 26px), station name and meta line, right-aligned sector-coloured mileage in display 30px with odometer below. Pending, regressed and empty states use badges or an em dash.

### Mileage Bars (signature)
One bar per fill-up filled with the sector bar colour, value above, date below, dashed 2px foreground average line; bars grow in over 0.7s with 40ms stagger (motion-safe only). Legend uses 9px rounded squares.

## Do's and Don'ts

### Do:
- **Do** colour mileage via `sectorOf` and the `SECTOR_TEXT` / `SECTOR_BAR` maps.
- **Do** set headings, numerals and station codes in Big Shoulders Display; everything else in Hanken Grotesk.
- **Do** use pill buttons, 20px cards, and one lime slab per screen.
- **Do** define both themes' values for any new token in `:root` and `.dark`.

### Don't:
- **Don't** use sector purple, green or amber for non-mileage decoration.
- **Don't** add a monospace face; use tabular numerals.
- **Don't** add a second saturated brand colour beside lime.
- **Don't** hardcode hex in components when a token exists.
