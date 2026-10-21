# Graph Report - notRPC  (2026-10-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 215 nodes · 373 edges · 13 communities (9 shown, 4 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b107a53d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11

## God Nodes (most connected - your core abstractions)
1. `en()` - 13 edges
2. `advancePlayerPrepQueue()` - 10 edges
3. `B()` - 10 edges
4. `proceedAfterClash()` - 9 edges
5. `Z()` - 9 edges
6. `I()` - 8 edges
7. `y()` - 8 edges
8. `generatePlayerQuests()` - 8 edges
9. `resolveRound()` - 7 edges
10. `a()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `handleSelectPack()` --calls--> `generatePackCards()`  [EXTRACTED]
  server/roomManager.js → server/gameLogic.js
- `proceedAfterClash()` --calls--> `generateBonusPickCards()`  [EXTRACTED]
  server/roomManager.js → server/gameLogic.js
- `proceedAfterClash()` --calls--> `generatePacks()`  [EXTRACTED]
  server/roomManager.js → server/gameLogic.js
- `startQuestSelectionPhase()` --calls--> `generatePlayerQuests()`  [EXTRACTED]
  server/roomManager.js → server/quests.js
- `handleReconnectMatch()` --calls--> `generatePlayerQuests()`  [EXTRACTED]
  server/roomManager.js → server/quests.js

## Import Cycles
- None detected.

## Communities (13 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (41): evaluateClash(), generatePackCards(), generateStarterDeck(), generateMatchRaritySchedule(), advancePlayerPrepQueue(), auth, autoResolvePlayerPrepQueue(), cleanupRoom() (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (37): a(), b(), c(), D(), E(), en(), B(), C() (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (21): description, engines, node, main, name, private, scripts, start (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (22): generatePlayerQuests(), generateReward(), getRemovalTokenReward(), isQuestSupported(), MATCH_RARITY_PATTERNS, QUEST_TEMPLATES, { RELIC_POOL }, RELIC_POOL (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (17): CARD_POOL, CLASH_RULES, ELEMENTS, PACK_POOL, PACK_TYPES, { CARD_POOL, CLASH_RULES, HAND_SIZE, ELEMENTS, PACK_TYPES }, createCardInstance(), draftExclusivePool (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (7): nanoid, broadcastQueueCount(), checkAndMatch(), join(), leave(), { nanoid }, queue

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (8): dependencies, bcryptjs, dotenv, express, jsonwebtoken, nanoid, pg, socket.io

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): init(), isDiscordActivity, socket, SocketService, startDiscordSdk(), storedToken

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): AudioSynth, RELIC_DATABASE, UI

## Knowledge Gaps
- **2 isolated node(s):** `dotenv`, `socket.io`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 94 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nanoid` connect `Community 6` to `Community 0`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `dotenv`, `socket.io` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08115942028985507 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Community 7` to `Community 2`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13124274099883856 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Community 2` to `Community 3`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0735632183908046 - nodes in this community are weakly interconnected._