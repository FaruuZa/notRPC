# Graph Report - notRPC  (2026-10-21)

## Corpus Check
- 28 files · ~44,515 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .stackdump 4, (none) 2, .css 2)

## Summary
- 289 nodes · 491 edges · 19 communities (11 shown, 8 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ff8c310`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- reconnect.js
- anime.min.js
- package.json
- server.js
- gameLogic.js
- gameLogic.js
- Design System: Element Clash
- socket.js
- game.js
- ui.js
- animations.js
- Product
- audio.js
- card-desc.js
- battle.js
- clash-pipeline.js
- auth.js

## God Nodes (most connected - your core abstractions)
1. `en()` - 13 edges
2. `B()` - 10 edges
3. `Product` - 10 edges
4. `Z()` - 9 edges
5. `proceedAfterClash()` - 9 edges
6. `advancePlayerPrepQueue()` - 9 edges
7. `generatePlayerQuests()` - 9 edges
8. `Design System: Element Clash` - 9 edges
9. `y()` - 8 edges
10. `I()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `proceedAfterClash()` --calls--> `generateBonusPickCards()`  [EXTRACTED]
  server/battle.js → server/gameLogic.js
- `proceedAfterClash()` --calls--> `generatePacks()`  [EXTRACTED]
  server/battle.js → server/gameLogic.js
- `proceedAfterClash()` --calls--> `recordMatchToDb()`  [EXTRACTED]
  server/battle.js → server/roomState.js
- `handleRerollPrep()` --calls--> `generatePacks()`  [EXTRACTED]
  server/prepPhase.js → server/gameLogic.js
- `handleSelectPack()` --calls--> `generatePackCards()`  [EXTRACTED]
  server/prepPhase.js → server/gameLogic.js

## Import Cycles
- None detected.

## Communities (19 total, 8 thin omitted)

### Community 0 - "reconnect.js"
Cohesion: 0.11
Nodes (26): generateStarterDeck(), generateMatchRaritySchedule(), auth, drawHandFromDeck(), { generateMatchRaritySchedule, generatePlayerQuests }, { generateStarterDeck }, handleDisconnect(), handleRequestRematch() (+18 more)

### Community 1 - "anime.min.js"
Cohesion: 0.13
Nodes (37): a(), b(), c(), D(), E(), en(), B(), C() (+29 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (28): dependencies, bcryptjs, dotenv, express, jsonwebtoken, nanoid, pg, socket.io (+20 more)

### Community 3 - "server.js"
Cohesion: 0.07
Nodes (28): handleRerollQuests(), generatePlayerQuests(), generateReward(), getRemovalTokenReward(), isQuestSupported(), MATCH_RARITY_PATTERNS, QUEST_TEMPLATES, { RELIC_POOL } (+20 more)

### Community 4 - "gameLogic.js"
Cohesion: 0.13
Nodes (26): generateBonusPickCards(), generatePackCards(), generatePacks(), advancePlayerPrepQueue(), autoResolvePlayerPrepQueue(), clearPrepTimer(), drawHandFromDeck(), { generatePackCards, generateBonusPickCards, generatePacks } (+18 more)

### Community 6 - "gameLogic.js"
Cohesion: 0.14
Nodes (16): CARD_POOL, { ELEMENTS }, CLASH_RULES, ELEMENTS, { CARD_POOL }, { CLASH_RULES, HAND_SIZE, ELEMENTS }, createCardInstance(), draftExclusivePool (+8 more)

### Community 7 - "Design System: Element Clash"
Cohesion: 0.10
Nodes (20): Buttons, Colors, Components, Design System: Element Clash, Do:, Do's and Don'ts, Don't:, Elemental Palette (Solid & Matte) (+12 more)

### Community 8 - "socket.js"
Cohesion: 0.29
Nodes (6): init(), isDiscordActivity, socket, SocketService, startDiscordSdk(), storedToken

### Community 13 - "Product"
Cohesion: 0.18
Nodes (10): Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+2 more)

### Community 16 - "battle.js"
Cohesion: 0.17
Nodes (17): advancePlayerPrepQueue(), clearPrepTimer(), drawHandFromDeck(), { evaluateClash, generateBonusPickCards, generatePacks }, handleClashFinished(), handleLockSelection(), handleTurnTimeout(), { MAX_HP } (+9 more)

### Community 18 - "auth.js"
Cohesion: 0.13
Nodes (8): bcryptjs, pg, bcrypt, db, jwt, initDb(), { Pool }, query()

## Knowledge Gaps
- **2 isolated node(s):** `dotenv`, `socket.io`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 144 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nanoid` connect `package.json` to `battle.js`, `gameLogic.js`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `dotenv`, `socket.io` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `reconnect.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Why does `express` connect `package.json` to `server.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `anime.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13124274099883856 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07311827956989247 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07058823529411765 - nodes in this community are weakly interconnected._