# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Casual to competitive players looking for quick (3-5 min) tactical 1v1 card battles directly in their desktop or mobile browsers.

## Product Purpose

Element Clash delivers immediate, session-based realtime multiplayer elemental card combat without installations, long matchmaking queues, or pay-to-win mechanics.

## Positioning

A fast-paced, accessible tactical card battler marrying classic elemental interactions (extended rock-paper-scissors with Neutral and Chaos dynamics) with on-the-fly secret drafting, active combat relics, and in-match quests.

## Operating Context

- Web browsers across desktop and mobile devices (with forced landscape orientation for mobile play).
- Short, high-intensity multiplayer sessions synchronized over WebSockets (Socket.IO).
- Low-latency matchmaking and fast turn timers that demand quick tactical decision-making.

## Capabilities and Constraints

- **Platform & Architecture:** Node.js, Express, Socket.IO, Vanilla JavaScript, CSS, Anime.js without complex build pipelines.
- **Mobile Support:** Mobile landscape orientation is a primary requirement, managed with viewport orientation detection.
- **Elemental Combat Rules:**
  - Standard RPS cycle: Fire beats Nature, Nature beats Water, Water beats Fire.
  - Neutral element: Ties standard elements, counters Chaos.
  - Chaos element: Beats Fire, Water, and Nature; countered by Neutral.
- **Battle Systems:**
  - Secret Draft phase (5 cards chosen out of 8).
  - Health Points (100 HP max), damage calculation, shields, status effects, and round point progression.
  - Synchronized TFT-style quest rarity schedule across rounds for both players with guaranteed Removal Token yield (Common: 0, Rare: 1, Epic: 2).
  - Preparation Phase deck purification: spend Removal Tokens to permanently burn cards (min deck size: 4 cards). Unused tokens persist in inventory.
  - Dynamic relic buffs/triggers and active in-match quest objectives with instant rewards.
  - Integrated Game Library/Compendium for card, relic, and rules reference.

## Brand Commitments

- **Name:** Element Clash (package: `notrpc-realtime-card-game`).
- **Tone & Identity:** High-energy, tactical, and competitive tabletop elemental arena.
- **Visual Commitments:** Dark carbon felt tabletop mats (`#121620`), antique warm brass framing (`#a68058`), solid flat elemental palettes (The No-Neon Rule), responsive card slots, and fluid motion feedback.

## Evidence on Hand

- Playable client in `public/` (`index.html`, `css/`, `js/`).
- Authoritative game logic, clash rules, and relics in `server/constants.js`, `server/gameLogic.js`, and `server/relics.js`.
- Realtime room management and matchmaking in `server/roomManager.js` and `server/matchmaking.js`.

## Product Principles

- **Instant Playability:** Zero friction from landing to battle—enter a battle name and queue up immediately.
- **Clarity Over Clutter:** Vital combat data (HP, shields, turn timers, element affinities, and active effects) must be legible at a glance.
- **Fair & Skill-First:** Balanced drafting, deterministic elemental counters, and skill-driven tactics without pay-to-win elements.
- **Responsive Immersion:** Fluid tactile animations and feedback for card clashes, damage pops, and victory/defeat moments.
