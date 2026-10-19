---
name: Element Clash
description: Realtime multiplayer tactical element card game
colors:
  primary: "#a68058"
  bg-felt: "#121620"
  bg-cardboard: "#1c202d"
  bg-inner-panel: "#181c26"
  border-mat: "#293245"
  border-brass: "#a68058"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-dark: "#0f172a"
  fire: "#d93838"
  fire-matte: "#2c1616"
  water: "#2c7be5"
  water-matte: "#16202c"
  nature: "#2d9a59"
  nature-matte: "#162c1e"
  neutral: "#64748b"
  neutral-matte: "#20242c"
  chaos: "#8e44ad"
  chaos-matte: "#25162c"
  shield: "#00bcd4"
typography:
  display:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "'Outfit', sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.bg-cardboard}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
---

# Design System: Element Clash

## Overview

**Creative North Star: "Classic Tabletop Felt Sanctum"**

Element Clash channels the disciplined, weighty atmosphere of high-stakes physical trading card games played on pristine tabletop felt mats. Rather than relying on ephemeral digital neon washes or sensory overload, the system establishes immersion through tactile materiality: deep carbon felt playmats, rich cardboard textures, antique warm brass boundary lines, and subdued matte elemental hues.

Every screen behaves as a deliberate gaming surface. Panels feel like solid, physical game boards laid out with purpose, where elemental affinities (Fire, Water, Nature, Neutral, and Chaos) are communicated through crisp graphic icons and solid, saturated pigments. Contrast is structural and confident, prioritizing immediate tactical legibility during rapid turn clocks.

**Key Characteristics:**
- Grounded tabletop materiality rooted in dark carbon felt (`#121620`) and cardboard tones (`#1c202d`).
- Warm antique brass framing (`#a68058`) providing distinct heirloom gaming aesthetics.
- Solid, non-neon elemental color coding for instantaneous cognitive recognition.
- Pure flat elevation relying on tonal separation and precise borders rather than heavy ambient blur.

## Colors

The palette balances dark neutral felts with warm brass structural accents and distinct matte elemental signifiers.

### Primary
- **Warm Antique Brass** (`#a68058`): Used for primary interactive triggers, active turn frames, card borders, and victory/gold accents.

### Neutral
- **Carbon Felt** (`#121620`): The base tabletop surface across all game screens and arena playmats.
- **Cardboard Surface** (`#1c202d`): Secondary structural containers, card backings, and lobby cards.
- **Inner Panel Surface** (`#181c26`): Recessed slots, HUD trays, and inactive card wells.
- **Mat Border** (`#293245`): Subtle architectural framing delineating table partitions and card slots.
- **Text Primary** (`#f8fafc`): High-contrast crisp white for essential combat numbers, names, and titles.
- **Text Secondary** (`#94a3b8`): Subdued slate grey for descriptive rules, timers, and meta information.
- **Text Dark** (`#0f172a`): Deep contrast ink used on warm brass button faces.

### Elemental Palette (Solid & Matte)
- **Fire** (`#d93838`) / **Fire Matte** (`#2c1616`): Aggressive crimson red representing raw attack and combustion.
- **Water** (`#2c7be5`) / **Water Matte** (`#16202c`): Focused cobalt blue representing flow, control, and recovery.
- **Nature** (`#2d9a59`) / **Nature Matte** (`#162c1e`): Vibrant forest emerald representing growth, poison, and resilience.
- **Neutral** (`#64748b`) / **Neutral Matte** (`#20242c`): Balanced stone grey representing stability, counter-chaos, and fortitude.
- **Chaos** (`#8e44ad`) / **Chaos Matte** (`#25162c`): Deep amethyst violet representing unpredictability, superiority over basics, and arcane risk.
- **Shield** (`#00bcd4`): Cyan highlight representing dynamic warding and absorption barriers.

### Named Rules
**The No-Neon Rule.** Dilarang menggunakan efek glow bloom atau neon berlebihan. Gunakan solid flat color dan warna dasar matte yang bersih untuk menjaga kejernihan visual dan nuansa TCG fisik.
**The Flat-Surface Rule.** Elemen bertumpuk mengandalkan kontras tonal antar panel (`--bg-inner-panel` vs `--bg-cardboard` vs `--bg-felt`) serta border garis tegas, bukan drop shadow tebal yang mengaburkan batas elemen.

## Typography

**Display Font:** 'Space Grotesk' (fallback: sans-serif)  
**Body Font:** 'Outfit' (fallback: sans-serif)  
**Label Font:** 'Space Grotesk' (fallback: sans-serif)

**Character:** Technical precision meets clean modern geometric clarity. Space Grotesk injects structural authority into headers, scores, and elemental tags, while Outfit provides effortless legibility across dense rulebooks, card descriptions, and HUD statistics.

### Hierarchy
- **Display** (Bold 700, `clamp(2rem, 5vw, 3.2rem)`, `line-height: 1.1`): Arena banners, main logo titles, game-over proclamations.
- **Headline** (Semi-bold 600, `1.4rem` to `1.8rem`, `line-height: 1.2`): Screen headers, draft phase titles, modal headers.
- **Title** (Semi-bold 600, `1.1rem` to `1.25rem`, `line-height: 1.3`): Card names, player names in HUD, quest titles.
- **Body** (Regular 400, `0.9rem` to `1rem`, `line-height: 1.5`): Card descriptions, rule text, tutorial tooltips, lobby status.
- **Label** (Medium 500, `0.75rem` to `0.85rem`, `letter-spacing: 0.05em`, uppercase): Elemental badges, timer indicators, stat headers, button labels.

## Layout

- **Spatial Model:** Horizontal arena mat layout engineered strictly for desktop and landscape orientation mobile devices.
- **Orientation Anchor:** Enforced landscape viewport. Portrait mode activates a rotation directive overlay to preserve table geometry.
- **Arena Zones:**
  - **Upper Perimeter:** Player HUD (top-left) and Enemy HUD (top-right) anchored along the top border, displaying HP meters, shield indicators, relic ribbons, and round victory dots.
  - **Central Dueling Zone:** Confrontational card clash slots ("YOUR PLAY" vs "OPPONENT PLAY") framing the central VS clash indicator and lock-in actuator.
  - **Lower Field:** Hand tray and inventory drawer presenting cards with ample hit targets for rapid selection.
- **Spacing Scale:** Built on an 8px base grid (`xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`).

## Elevation & Depth

Element Clash uses a **pure flat tonal layering** philosophy. Surfaces stack through distinct tonal tiers rather than simulated atmospheric elevation or heavy multi-stop shadows.

- **Level 0 (Base Mat):** Clean carbon felt (`--bg-felt: #121620`).
- **Level 1 (Structural Trays & Cards):** Cardboard backing (`--bg-cardboard: #1c202d`) bordered by mat stroke (`--border-mat: #293245`).
- **Level 2 (Active/Interactive Focus):** Inset wells and active slots (`--bg-inner-panel: #181c26`) highlighted with warm brass borders (`--border-brass: #a68058`).
- **State Feedback:** State changes (hover, selection, lock-in) trigger border color shifts and subtle 1-2px vertical transforms rather than swelling drop shadows.

## Shapes

- **Corner Language:** Tight, disciplined radii. Card containers and modal dialogs maintain a subtle, tactile `rounded-sm` (4px) or `rounded-md` (8px). Buttons maintain crisp 4px edges.
- **Borders & Framing:** 1px to 2px solid strokes form the primary boundary definition. Inactive containers use `#293245`; active cards, selection frames, and brass headers use `#a68058`.
- **Card Aspect Ratio:** Modeled on traditional standard trading cards (~2.5 : 3.5 ratio) with explicit division between art header, elemental badge, and lower rule typography.

## Components

### Buttons
- **Shape:** Rounded 4px (`rounded-sm`), uppercase typography, letter-spaced.
- **Primary:** Warm brass background (`#a68058`), dark ink text (`#0f172a`), solid tactile padding (`12px 24px`).
- **Secondary:** Dark cardboard background (`#1c202d`), white text (`#f8fafc`), 1px mat border (`#293245`).
- **Hover / Focus:** Border brightness increase, 1px upward translateY lift, zero blur spread.
- **Disabled:** Dimmed slate background (`#20242c`), muted text (`#64748b`), cursor not-allowed.

### Playing Cards
- **Shape:** 4px radius, 1.5px solid border (`#293245` at rest, elemental color or `#a68058` on selection).
- **Background:** Matte elemental background (`--bg-[element]-matte`) paired with cardboard backing.
- **States:**
  - *Resting:* Level 1 cardboard layer.
  - *Selected / Hovered:* Lifted -8px on the Y-axis with solid brass or elemental highlight border.
  - *Locked:* Fixed slot drop with confirmation border.

### HUD Panels
- **Container:** Dark inner panel (`#181c26`), 1.5px mat border (`#293245`), 8px radius.
- **Health Bar:** Deep inset trough with flat red/green HP fill and numerical overlay in Space Grotesk.
- **Shield Counter:** Cyan icon badge (`#00bcd4`) updating dynamically on ward changes.
- **Round Points:** Tri-dot status indicator filled with warm brass for secured rounds.

### Inputs / Fields
- **Style:** Deep carbon background (`#121620`), 1.5px slate border (`#293245`), 4px radius, crisp white text.
- **Focus:** Border transitions smoothly to warm brass (`#a68058`).

## Do's and Don'ts

### Do:
- **Do** maintain crisp, flat contrast between carbon felt mats, inner panels, and card frames.
- **Do** represent each elemental affinity with its exact canonical solid color and matching dark matte backing.
- **Do** enforce landscape layout and test readability at tight mobile screen dimensions.
- **Do** preserve the Space Grotesk and Outfit typographic hierarchy for immediate battle data recognition.

### Don't:
- **Don't** add diffuse neon glows, bloom filters, or noisy chromatic aberrations around cards or buttons.
- **Don't** use soft, fuzzy drop-shadows to separate layers; rely strictly on background tonal contrast and crisp borders.
- **Don't** mix non-canonical element colors; keep Fire, Water, Nature, Neutral, and Chaos clearly distinct and deterministic.
- **Don't** break the forced landscape orientation model on mobile viewports.
