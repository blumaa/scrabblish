# Scrabblish — Implementation Plan

## 1. Project Context

A 2-player turn-based Scrabble app. **Unique selling point: Multi-language games.** When creating a game, you pick which languages are valid (e.g., English + German). Any word valid in *any* selected language counts. MVP supports English and German; architecture supports adding more languages later.

- Web: React 19 PWA (Vite)
- iOS: Capacitor wrapper
- Backend: Supabase (Auth, Realtime, Edge Functions)
- Supports multiple concurrent games, each with its own language set
- Detailed stats tracking (per-language word counts, best words, win/loss, etc.)

## 2. Tech Stack

- **Frontend:** React 19 + TypeScript + GSAP (Animations & Draggable)
- **Rendering:** Hybrid SVG + HTML — SVG for board & tiles only, HTML/CSS for controls, scores, overlays, forms, navigation
- **Backend:** Supabase Free Tier (email+password auth, Realtime, Edge Functions)
- **Game Logic:** useReducer for local state; Edge Functions for authoritative validation
- **Dictionary:** Client-side for instant UI feedback (Web Worker); Server-side (Edge) for move commitment
- **Dictionary Storage:** Gzipped newline-delimited text files (~1.5MB per language), versioned filenames for cache busting
- **Testing:** Vitest + Testing Library (unit/component), Playwright (integration/drag/zoom)
- **CI/CD:** GitHub Actions (lint, typecheck, test, deploy Edge Functions, deploy frontend)
- **Monitoring:** Sentry for client-side errors, structured logging in Edge Functions

## 3. Supabase Schema

```sql
-- Profiles for display and discovery
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null check (char_length(display_name) <= 30),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_at timestamptz default now()
);

-- Each game stores its own set of allowed languages
create table games (
  id uuid primary key default gen_random_uuid(),
  -- 8 alphanumeric chars, excluding confusables (0/O, 1/l/I)
  join_code text unique not null,
  languages text[] not null default '{en,de}',
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  player1_id uuid not null references auth.users(id),
  player2_id uuid references auth.users(id),
  current_turn uuid references auth.users(id),
  move_number int not null default 0,  -- optimistic concurrency control
  board_state jsonb not null default '[]',
  winner_id uuid references auth.users(id),
  stats_computed boolean not null default false,  -- idempotent finish-game
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_move_at timestamptz  -- for timeout/abandonment detection
);

-- Indexes for game list queries
create index idx_games_player1 on games(player1_id);
create index idx_games_player2 on games(player2_id);
create index idx_games_active on games(status) where status != 'finished';
create index idx_games_join_code on games(join_code) where status = 'waiting';

-- Individual moves (append-only, not a JSONB blob)
create table moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  move_number int not null,
  move_type text not null check (move_type in ('place', 'exchange', 'pass')),
  tiles_placed jsonb,         -- for 'place': [{letter, row, col, points, isBlank}]
  words_formed jsonb,         -- [{word, score, language}]
  score int not null default 0,
  tiles_exchanged_count int,  -- for 'exchange'
  created_at timestamptz default now(),
  unique(game_id, move_number)
);

create index idx_moves_game on moves(game_id);

-- Tile bag + hands: service-role only (players NEVER see this)
create table game_secrets (
  game_id uuid primary key references games(id) on delete cascade,
  tile_bag jsonb not null,
  player1_hand jsonb not null default '[]',
  player2_hand jsonb not null default '[]'
);

-- Per-language stats (scales to any number of languages without migration)
create table player_stats (
  user_id uuid primary key references auth.users(id),
  games_played int default 0,
  wins int default 0,
  total_score int default 0,
  best_word_score int default 0,
  best_word text,
  longest_word text,
  current_win_streak int default 0,
  best_win_streak int default 0,
  updated_at timestamptz default now()
);

create table player_language_stats (
  user_id uuid not null references auth.users(id),
  language text not null,  -- 'en', 'de', 'es', etc.
  words_played int default 0,
  primary key (user_id, language)
);

-- Push tokens for APNs and Web Push
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  token text not null,
  platform text not null check (platform in ('web', 'ios')),
  last_used_at timestamptz default now(),
  unique(user_id, token)
);
```

### RLS Policy Matrix (CRITICAL — define before writing any code)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | All authenticated | Own only | Own only | Own only |
| `games` | Participants only (`auth.uid() IN (player1_id, player2_id)`) | **DENY** (Edge Functions only) | **DENY** (Edge Functions only) | **DENY** |
| `moves` | Participants of parent game | **DENY** (Edge Functions only) | **DENY** | **DENY** |
| `game_secrets` | **DENY ALL** | **DENY ALL** | **DENY ALL** | **DENY ALL** |
| `player_stats` | All authenticated | **DENY** (Edge Functions only) | **DENY** (Edge Functions only) | **DENY** |
| `player_language_stats` | All authenticated | **DENY** (Edge Functions only) | **DENY** (Edge Functions only) | **DENY** |
| `push_tokens` | **DENY** (service-role only) | Own only (`user_id = auth.uid()`) | Own only | Own only |

All game mutations go through Edge Functions using the service role key. The client ONLY has read access to `games` and `moves`.

### Key Design Decisions
- **`join_code`**: 8 alphanumeric characters excluding confusables (0/O, 1/l/I) = 30^8 = ~656 billion codes. Generated by `create-game` Edge Function, not a DB default. Rate limited: max 10 join attempts per IP per minute. Codes expire after 30 minutes.
- **`moves` table**: Append-only INSERTs instead of rewriting a JSONB blob. No write contention, naturally ordered, queryable for stats.
- **`move_number`**: Optimistic concurrency control. Every `game-action` Edge Function checks `WHERE move_number = expected`. Stale/duplicate requests fail.
- **`game_secrets`**: DENY ALL via RLS. Only Edge Functions (service role) can read/write. Players never see the bag or opponent's hand.
- **`player_language_stats`**: Separate table, not per-language columns. Adding a language requires zero schema changes.
- **`stats_computed`**: Idempotent `finish-game` — safe to retry if it crashes mid-computation.

### Edge Functions (combined where possible)
- **`create-game`** — Generate join code, init `game_secrets` with merged bag + dealt hands, create game row
- **`join-game`** — Rate-limited. Find game by join code, deal hand to player2, set status=active
- **`game-action`** — Combined handler for `submit-move`, `exchange-tiles`, `pass-turn`. All need the same setup (load game, verify turn, load secrets). Shares dictionary cache. Uses `SELECT FOR UPDATE` in a transaction for concurrency safety. Inline notification sending (try/catch, not a separate function).
- **`get-hand`** — Returns the requesting player's hand from `game_secrets`. Called on game load.
- **`finish-game`** — Iterate moves, check per-language dictionaries for word attribution, update `player_stats` + `player_language_stats`. Idempotent via `stats_computed` flag.

### Concurrency Protection (CRITICAL)
Every `game-action` call wraps its logic in a transaction:
```sql
BEGIN;
SELECT * FROM games WHERE id = $1 AND current_turn = $2 FOR UPDATE;
-- If no row returned → turn already changed, abort
-- Validate move, update games (increment move_number), insert into moves, update game_secrets
COMMIT;
```
The `FOR UPDATE` lock prevents two simultaneous submissions from corrupting state.

## 4. Merged Tile Bag Strategy

**Problem:** Using one language's tile set in a multi-language game is unfair — letter frequencies are tuned for that language.

**Solution: Merged tile bag.** For each letter shared between the selected languages, take the MAX count from either distribution. Then add language-specific tiles (Ä, Ö, Ü for German).

```
Example: EN + DE merged bag

Shared letters: MAX of each language's count
  A: max(9, 5) = 9     E: max(12, 15) = 15
  S: max(4, 7) = 7     N: max(6, 9) = 9
  R: max(6, 6) = 6     T: max(6, 6) = 6
  ... (for all A-Z)

DE-specific tiles added:
  Ä: 1 (1pt)   Ö: 1 (2pt)   Ü: 1 (2pt)

Blanks: max(2, 2) = 2

Result: ~120-130 tiles (slightly longer games)
Both languages fairly represented.
```

**Implementation in `lib/tile-bag.ts`:**
- `createMergedBag(languages: Language[])` — loads tile definitions for each language, merges using MAX strategy, returns shuffled bag
- Single-language games use that language's standard set (100 EN / 102 DE)
- Point values: when tiles exist in both languages with different points, use the higher value (rewards cross-language play)
- **Shuffle must use `crypto.getRandomValues()`** (not `Math.random()`) — server-side only, cryptographically secure

**Ä/Ö/Ü in English words:** Self-enforcing via dictionary validation. English dictionaries don't contain Ä, so it can only be used in German words. No special handling needed.

## 5. Multi-Language Dictionary Strategy

- **Storage:** One versioned gzipped file per language: `en.v1.dict.gz`, `de.v1.dict.gz`. Versioned filenames enable cache busting when dictionaries are updated.
- **Client loading (Web Worker):** Decompress + build Sets in a Web Worker to avoid blocking the main thread (1-3 seconds for 300K words). Build two per-language `Set<string>` objects (not a merged third set — just use `enSet.has(word) || deSet.has(word)` to save memory). Transfer Sets back to main thread via structured clone.
- **Server:** `game-action` Edge Function loads dictionaries for the game's languages. Cached in global isolate memory. Dictionary files bundled with the Edge Function (not fetched from storage). Lazy-load only the languages needed for the current game.
- **Bilingual scoring:** When "HAND" is played:
  1. `en_set.has("HAND")` → true → attribute to EN
  2. `de_set.has("HAND")` → true → attribute to DE
  3. `WordFeedback.tsx` renders `[EN]` + `[DE]` language code badges
  4. `finish-game` increments BOTH `player_language_stats` rows
- **Client + Server dictionary versions must match.** Pin versions. Use content hash or version tag.
- **Adding a new language:** Drop a new `{lang}.v1.dict.gz`, add tile set constants. No schema migration needed.

## 6. Board Zoom, Pan & Gesture State Machine

### Rendering Architecture (SVG Layers)
The board SVG uses layered `<g>` elements for performance:

```
Layer 0: <g id="board-bg"> — static board grid + premium squares + labels
         pointer-events="none", never animated, never re-rendered
Layer 1: <g id="committed-tiles"> — tiles from previous turns, rarely animated
Layer 2: <g id="pending-tiles"> — tiles placed THIS turn, actively animated
Layer 3: <g id="effects"> — score popups, word highlights, valid word borders
         will-change: transform (GPU promoted)
Layer 4: <g id="drag-ghost"> — tile being dragged
```

The rack is a separate SVG element below the board (HTML layout, not inside the board SVG).

### Zoom/Pan Behavior
- **Double-tap:** Toggles between zoomed-out and zoomed-in
- **Pinch gesture:** Fine-grained zoom control (mobile)
- **Playing a tile:** Auto-zooms in to the placement area (pan first, then zoom — never simultaneous to avoid motion sickness)
- **Zoomed-in panning:** Single-finger drag on board (non-tile area) moves the viewport

### Hybrid Pinch Implementation
- **During active pinch gesture:** Use CSS `transform: scale()` on a wrapper `<g>` — pure GPU, no layout recalc, 60fps
- **On gesture end:** Commit the scale back to `viewBox`, reset CSS transform to identity
- This gives GPU-smooth pinch + mathematically correct SVG coordinates at rest

### ViewBox Locking During Drag (CRITICAL)
When a tile drag starts, freeze zoom/pan. Resume when drag ends. This prevents `getScreenCTM()` from changing mid-drag (which causes tile teleportation). The auto-zoom-on-placement fires only AFTER `onDragEnd`, never during.

### Gesture Disambiguation State Machine
Lives in `useBoardViewport.ts` as a `useReducer`:

```
State: IDLE
  ↓ touchstart (1 finger, on rack tile) → START_TILE_DRAG
  ↓ touchstart (1 finger, on board non-tile) → PAN_CANDIDATE (50ms timeout)
  ↓ touchstart (1 finger, on "just placed" tile) → START_TILE_REPOSITION
  ↓ touchstart (2 fingers) → START_PINCH

State: START_TILE_DRAG
  ↓ touchmove (>8px) → TILE_DRAGGING (activate Draggable, lock viewBox)
  ↓ touchend (<8px) → IDLE (no-op tap)

State: PAN_CANDIDATE
  ↓ second finger added within 50ms → START_PINCH (cancel pan)
  ↓ touchmove (>8px, 50ms elapsed) → PANNING
  ↓ touchend → double-tap detection → IDLE

State: START_PINCH
  ↓ both fingers moving → PINCHING (CSS transform only, no viewBox)
  ↓ one finger lifts → commit pinch to viewBox, → PANNING
  ↓ both fingers lift → commit scale to viewBox, → IDLE

State: TILE_DRAGGING / START_TILE_REPOSITION
  ↓ second finger added → IGNORE (tile drag takes priority)
  ↓ touchend → snap to grid OR recall, → IDLE
```

The 50ms `PAN_CANDIDATE` delay prevents a pinch's first finger from activating pan before the second finger arrives.

### Screen-to-SVG Coordinate Conversion
`lib/svg-coords.ts` — uses `SVGElement.getScreenCTM().inverse()` to convert screen coords → SVG user units. Called by `useDragTile.ts` on every drag event. Recalculated when viewBox changes (but viewBox is locked during drag, so this only happens between drags).

### GSAP Draggable SVG Gotchas
- Always use `type: "x,y"` (not `type: "top,left"` — has no effect on SVG)
- `bounds` option doesn't work with SVG elements — compute board screen rect manually, pass as `{top, left, width, height}`, recalculate on viewBox change
- Keep ALL drag-related events in GSAP only — no React pointer handlers on the same SVG group (prevents double-fire with React 19 event delegation)
- `gsap.context()` does NOT auto-cleanup Draggable instances — must call `draggable.kill()` explicitly in cleanup
- Use `useLayoutEffect` (not `useEffect`) for animations that start on mount (prevents first-frame flash)
- In React 19 StrictMode, use refs (not closures over state) for anything GSAP context reads at animation time
- Per-tile `gsap.context()` (not one top-level context) for dynamically added/removed tiles

## 7. Interaction & UX

### A. Drag-and-Drop (GSAP Draggable) — Primary Interaction
- Rack tiles are draggable SVG groups with snap-to-grid on the board
- **Screen-to-SVG coordinate conversion** via `getScreenCTM().inverse()`
- Smooth GSAP tweens for snap, place, and recall
- Individual tile recall: tap or drag a "just placed" tile back to rack
- "Recall All" button in controls
- Returned tiles snap back to their original rack position (not appended to end)
- Haptic feedback on iOS via `@capacitor/haptics`
- All animations in `gsap.context()` with explicit `draggable.kill()` cleanup

### B. The Magnifier
On touch devices, when dragging a tile, show a zoomed-in preview ~100px above the touch point. Implemented as a **separate small SVG element** (not `<use>`) with its own viewBox showing a ~3×3 tile area around the drag position. Renders only ~9 squares + nearby tiles (~20 DOM nodes). Positioned absolutely via CSS. This avoids the Safari `<use>` shadow DOM rendering bugs.

### C. Blank Tiles (Jokers)
- On drop, trigger "iris wipe" overlay expanding from tile position
- **6×5 letter grid** (not 3×9) — fits 30 cells for A-Z + Ä/Ö/Ü, each cell ~55px on 375px screen (above 44px touch minimum)
- Letters in alphabetical order, umlauts after their base vowel (A, Ä, B, C... O, Ö, P... U, Ü, V...)
- Cancel button at bottom
- Selected letter renders in "ghostly" style (0 points)

### D. Multi-Language UI Feedback
- Language **code badges** `[EN]` `[DE]` (not flags — flags are hard to read at small sizes and culturally ambiguous)
- Badges are colored pills next to the floating score animation
- Words valid in both languages show both badges
- **Real-time valid word border:** As tiles are placed, if they form a valid word in any selected language, a **green border** wraps around the entire word (SVG rect on effects layer, `stroke: #2ecc71`, `strokeWidth: 2`, `fill: none`, with subtle GSAP fade-in). Border updates live as tiles are added/removed/repositioned. Disappears when tiles are recalled. No border for invalid words — the absence of green is the signal.

### E. Multiple Concurrent Games
- Games list sorted by: your turn (oldest first — longest-waiting opponent), then their turn, then finished
- Your-turn games: **solid accent-colored left border** (not pulsing — pulsing is disruptive at scale). Single subtle pulse only if exactly one your-turn game.
- Each row shows: opponent avatar/initial + name, score (you vs them), language code badges, time since last move ("2h ago", "3d ago")
- Finished games in a separate collapsible section, not mixed in
- Tap target is the whole row
- Realtime subscription updates the list live (two subscriptions: one for player1_id, one for player2_id — Supabase Realtime doesn't support OR filters)

### F. Onboarding & Empty States
- **Empty home screen:** Clear primary CTA ("Start a Game"), brief tagline explaining bilingual twist, "Join a Game" secondary action. No empty list — use space for value proposition.
- **Create game screen:** Inline explanation: "Words valid in ANY selected language count!" Example: "HAND = valid in English AND German"
- **First move:** Tooltip on center star on player's first-ever game: "Place your first word here"
- **Waiting for opponent:** Join code shown prominently with share button + "Waiting for opponent..." state
- **Dictionary loading:** Determinate progress bar ("Loading German dictionary..."), not a spinner. For Capacitor: dictionaries bundled in app assets (zero network wait).

### G. Accessibility
- `prefers-reduced-motion` media query disables GSAP animations (Phase 3)
- ARIA labels on all interactive SVG elements
- Color is NOT the only indicator for premium squares / turn status (add text labels/patterns)
- Keyboard navigation for desktop: arrow keys to move cursor on board, Enter to place selected tile
- All text meets 4.5:1 contrast ratio
- Semantic HTML for all non-SVG UI (controls, forms, navigation)

### H. Visual Design Direction
- **Typography:** Distinctive slab serif or monospace for tile letters (game-feel, not spreadsheet). Clean sans-serif for UI chrome.
- **Color palette:** Decide before Phase 3. Classic Scrabble convention (cream base, red=TW, pink=DW, dark blue=TL, light blue=DL) is recognizable — can be fresh-ened with modern palette.
- **Layout:** Board gets 65-70% of screen height, rack 15%, controls + score 15-20%. Scoreboard is a minimal HTML top bar above the SVG.

## 8. State Management Architecture

### GameContext Provider
Instead of threading 6+ hooks through `GameScreen`, use a context provider:

```tsx
<GameProvider gameId={id}>
  <GameBoard />       {/* consumes board state + dispatch */}
  <GameRack />         {/* consumes hand + dispatch */}
  <GameControls />     {/* consumes turn state + dispatch */}
  <GameScoreBar />     {/* consumes scores */}
</GameProvider>
```

- `GameProvider` owns the `useReducer` + `useGameSync` + `useDictionary`
- Each sub-component consumes context slices directly
- `useBoardViewport` and `useDragTile` are LOCAL hooks within their components (UI interaction, not game state)
- Each sub-tree is independently testable with mock initial state

### Pending Moves Buffer (CRITICAL)
Tiles placed but not submitted live in a **separate `pendingTiles` array**, never in `board_state`:

- `board_state` = server truth (overwritten by Realtime)
- `pendingTiles` = client-only, uncommitted placements
- UI renders `board_state + pendingTiles` as a computed view
- When Edge Function confirms, the new `board_state` from server already includes those tiles → `pendingTiles` clears
- Realtime handler always overwrites `board_state` from server — never conflicts with local edits

### Client Hand Hydration
Hands live in `game_secrets` (invisible to client). The client gets its hand via:
1. On game load: call `get-hand` Edge Function → returns player's tiles
2. On every `game-action` response: response includes updated hand (newly drawn tiles)
3. Store hand in reducer state, not in Supabase client cache

### Reconnection & Error Recovery
- **Realtime disconnect:** On reconnect, fetch latest game state from Postgres (don't rely on catching up from Realtime stream). Also call `get-hand` to refresh hand.
- **Edge Function timeout/failure:** Retry with same `move_number` (idempotent via `move_number` check). If response was lost but move succeeded, the retry will fail with "stale move_number" and the client refetches state.
- **Auth token refresh:** Supabase handles automatically, but hooks must handle the brief expired-token window gracefully.

## 9. GSAP Animation Specifications

All animations use `gsap.context()` per component with explicit `draggable.kill()`. Use `useLayoutEffect` for mount animations. All respect `prefers-reduced-motion`.

### A. Tile Placement Snap
```
On drop over valid square:
  t=0→0.15s: tile tweens from drop position to grid center
             ease: "power3.out"
  t=0.15s:   haptic feedback (iOS)
  Premium square activation: if DW/TW/DL/TL, the square color saturates
  and blooms outward (feColorMatrix filter via GSAP attr tween), 0.4s
```

### B. Score Popup
```
t=0→0.15s:  <text> at tile position, scale: 0 → 1.4, ease: "back.out(2)"
t=0.15→0.3s: scale 1.4 → 1.0
t=0→0.5s:   translateY: 0 → -60px (floating up)
t=0.5→0.8s: opacity 1 → 0, continue floating
Language badges: slide in from sides, staggered 0.1s after number
If score > 30: burst of 8 small circles radiating outward
If score > 50 (7-tile bonus): gold glow + "+50 BONUS" sub-label
```

### C. Word Highlight Sweep
Before score popup: semi-transparent rect slides along the scored word's cells (first letter → last), 0.3s. Confirms which word scored.

### D. Valid Word Border (Real-time)
```
As tiles form a word, check dictionary client-side:
  Valid: green border rect fades in around word cells
    stroke: #2ecc71, strokeWidth: 2, fill: none
    GSAP fadeIn: opacity 0→1, duration 0.2, ease: "power2.out"
  Invalid: no border (absence of green = not yet valid)
  Border updates live as tiles move. Disappears on recall.
```

### E. Blank Tile Selector ("Iris Wipe")
```
Phase 1 (0–120ms): Dropped tile pulses, scale 1→1.3→1.0, warm glow filter
Phase 2 (80–300ms): Backdrop iris-wipe from tile position (SVG circle clipPath, radius 0→full)
Phase 3 (200–500ms): Letters cascade in, column by column:
  gsap.from(".letter-option", {
    scale: 0, opacity: 0, duration: 0.25,
    stagger: { amount: 0.3, grid: "auto", from: "center", axis: "x" },
    ease: "back.out(1.7)"
  })
Phase 4 (hover): Letter lifts — scale 1.2, subtle shadow, ±3deg rotation
Phase 5 (selection): Chosen letter scale 1.4→1.0, others scatter outward + fade
Phase 6 (dismiss): Iris-wipe closes
```

### F. Turn Transition (Opponent Just Played)
```
Phase 1 (0–0.4s): Opponent's tiles land with stagger (0.06s per tile, left→right)
  scale 1.3→1.0, ease: "bounce.out" (short bounce period 0.3s)
Phase 2 (0.3–0.7s): Word highlight sweep
Phase 3 (0.6–1.0s): Opponent score counter animates up
Phase 4 (1.0–1.4s): Board zooms out to full view, then re-centers
Phase 5 (1.2–1.6s): "Your Turn" banner — elastic.out(1, 0.5), stays 1.5s
  Subtle border pulse on rack
```

### G. Tile Draw From Bag
After move committed, new tiles fly onto rack one-by-one from a bag icon:
```
Stagger: 0.08s per tile
Motion: arc path (motionPath bezier)
Landing: subtle bounce into rack slot
```

### H. Rack Tile Hover/Lift
When finger/cursor approaches rack tile:
```
translateY: -4px, scale: 1.08
Duration: 0.1s, ease: "power2.out"
```

### I. Opponent "Thinking" Indicator
When it's opponent's turn, soft breathing pulse on their name:
```
gsap.to(opponentNameEl, {
  opacity: 0.5, duration: 1.2,
  yoyo: true, repeat: -1, ease: "sine.inOut"
});
// Kill immediately when opponent's move arrives
```

### J. Game Over Overlay
```
Phase 1 (0–0.5s): Board dims — overlay rect opacity 0→0.7
Phase 2 (0.3–1.0s): Score breakdown builds up, row per move
  Highest-scoring word gets star icon
Phase 3 (0.8–1.5s): Winner name drops in with elastic ease
  If local player won: gold + confetti burst
    (30 small rects with randomized motionPath beziers, rotating as they fall)
  If opponent won: silver/neutral, no confetti
Phase 4 (1.5s): "Play Again" + "New Game" buttons fade in
  pointer-events: none on everything else
```

### SVG Performance Rules
- Animate `transform="translate(x,y)"` via GSAP `svgOrigin`, NOT `attr.x`/`attr.y` (GPU composite vs layout)
- Premium square colors via CSS classes (`.sq-tw`, `.sq-dl`), not inline styles
- Effects layer gets `will-change: transform` for GPU promotion
- Use CSS `filter: blur()` (not SVG `<filter>`) for magnifier blur — composites on GPU
- SVG `<filter>` (feColorMatrix, feGaussianBlur) only for one-off effects (premium activation, blank tile glow)
- Profile on iPhone SE (320×568, 2.34x Retina scaling)

## 10. Project Structure

```
scrabblish/
  .github/workflows/ci.yml      # Lint, typecheck, test, deploy
  public/dictionaries/           # en.v1.dict.gz, de.v1.dict.gz (versioned)
  supabase/
    migrations/001_create_tables.sql
    migrations/002_rls_policies.sql
    functions/
      create-game/index.ts
      join-game/index.ts
      game-action/index.ts       # Combined: submit-move, exchange, pass
      get-hand/index.ts          # Returns player's hand from game_secrets
      finish-game/index.ts       # Stats computation (idempotent)
  src/
    types/game.ts                 # Tile, Board, GameState, GameAction, Move, Language
    constants/
      board.ts                    # Premium square positions (static map)
      tiles-en.ts                 # English letter distribution + points (100 tiles)
      tiles-de.ts                 # German letter distribution + points (102 tiles)
    lib/
      supabase.ts                 # Client singleton (anon key ONLY, never service role)
      scoring.ts                  # calculateMoveScore (premium squares, 7-tile bonus)
      validation.ts               # Structural placement + word formation rules
      board-utils.ts              # getWordsFormedByMove, connectivity checks
      tile-bag.ts                 # createBag, createMergedBag (crypto.getRandomValues), shuffle, draw
      dictionary.ts               # Load per-language dicts in Web Worker, per-language lookup
      dictionary.worker.ts        # Web Worker: decompress + build Sets
      svg-coords.ts               # Screen-to-SVG coordinate conversion (getScreenCTM)
      notifications.ts            # Push notification helpers
      stats.ts                    # Stats computation from moves
    hooks/
      useAuth.ts                  # Email+password auth
      useGameSync.ts              # Realtime subscription (single game) + reconnection
      useGamesList.ts             # Realtime on all user's games (two subscriptions)
      useDictionary.ts            # Web Worker dictionary loading
      useNotifications.ts         # Push notification setup
      useStats.ts                 # Fetch player stats
    context/
      GameProvider.tsx             # Owns useReducer + sync + dictionary
      GameContext.ts               # Context type + useGame() hook
    components/
      board/Board.tsx             # SVG board with layered <g> groups + dynamic viewBox
      board/Square.tsx            # Single square (CSS class for premium type)
      board/PlacedTile.tsx        # Letter tile on board (SVG group)
      board/DragGhost.tsx         # Tile following pointer during drag
      board/Magnifier.tsx         # Separate small SVG, ~3×3 area, CSS positioned
      board/useBoardViewport.ts   # LOCAL hook: zoom/pan/gesture state machine
      board/useDragTile.ts        # LOCAL hook: GSAP Draggable + snap + coord conversion
      rack/Rack.tsx               # Separate SVG, 7-tile rack
      rack/RackTile.tsx           # Draggable tile (GSAP Draggable)
      game/GameScreen.tsx         # CSS grid layout: score bar + SVG board + rack + controls
      game/ScoreBar.tsx           # HTML top bar: names, scores, turn indicator
      game/MoveControls.tsx       # HTML buttons: Submit / Recall All / Exchange / Pass
      game/TurnNotice.tsx         # HTML banner: "Your turn!" (GSAP animated)
      game/GameOverOverlay.tsx    # HTML overlay: scores + winner + confetti (SVG)
      game/BlankTileSelector.tsx  # HTML overlay: 6×5 letter grid, iris-wipe SVG backdrop
      game/WordFeedback.tsx       # SVG effects layer: score float + language badges
      stats/StatsScreen.tsx       # HTML stats dashboard
      stats/StatCard.tsx          # GSAP count-up animation
      stats/GameHistory.tsx       # Completed games list, per-game word breakdown
      screens/HomeScreen.tsx      # HTML: games list + create/join + stats link + onboarding
      screens/LoginScreen.tsx     # HTML: email + password auth
      screens/CreateGame.tsx      # HTML: language multi-select + join code
      screens/JoinGame.tsx        # HTML: enter join code
```

## 11. Implementation Phases

### Phase 0: Spike — GSAP Draggable + SVG ViewBox + React 19 (2-3 days)
Before committing to the full plan, prove the core interaction works:
- GSAP Draggable on an SVG `<g>` element
- Inside an SVG with dynamic viewBox
- With React 19 useReducer triggering re-renders during drag
- Pinch-to-zoom via CSS transform → viewBox commit
- Screen-to-SVG coord conversion at different zoom levels

If this spike fails, the fallback is HTML-based drag (CSS transforms) with SVG for static board rendering only.

### Phase 1: Foundation & Auth + CI/CD
1. Scaffold project (Vite + React 19 + TS)
2. GitHub Actions: lint + typecheck + test on every push
3. Supabase project (EU region for GDPR) + local dev instance (`supabase start`)
4. Run migrations (all tables + RLS policies)
5. Environment variables (`.env.local`, `.env.production` in `.gitignore`)
6. `useAuth.ts` — email+password sign-up/login (rate limiting via Supabase config, hCaptcha on signup)
7. `LoginScreen.tsx` with proper error messages ("Invalid email or password", never reveal if email exists)
8. `HomeScreen.tsx` with onboarding empty state
9. Privacy policy page (GDPR: what data, why, how long, deletion process)
10. Sentry setup for client-side error tracking

### Phase 2: The Logic Engine (TDD) — CRITICAL PATH
Tests first, then implement. This is the brain of the app.

1. `types/game.ts` — all type definitions (Language = 'en' | 'de', extensible)
2. `constants/board.ts` — 61 premium squares
3. `constants/tiles-en.ts` / `tiles-de.ts` — verify tile counts (100/102)
4. `lib/tile-bag.ts` — `createBag` + `createMergedBag` (MAX strategy, `crypto.getRandomValues`), shuffle, draw
5. `lib/board-utils.ts` — word detection, connectivity
6. `lib/scoring.ts` — premium squares, 50-point bonus, blank tiles (0 pts)
7. `lib/validation.ts` — tiles in line, connected, first move on center star
8. `GameProvider` + reducer + full test coverage (including pending moves buffer)

### Phase 3: SVG & GSAP Gameplay — SPIKE VALIDATED
1. SVG layered board architecture (static background, committed tiles, pending tiles, effects)
2. `lib/svg-coords.ts` — screen-to-SVG conversion
3. `useBoardViewport.ts` — gesture state machine + zoom/pan + viewBox locking
4. `Square.tsx`, `PlacedTile.tsx` (distinct style for "just placed")
5. `Rack.tsx` + `RackTile.tsx` — GSAP Draggable
6. `useDragTile.ts` — snap-to-grid using SVG coord conversion
7. `Magnifier.tsx` — separate small SVG
8. `BlankTileSelector.tsx` — 6×5 grid, iris-wipe enter/exit, language-aware letters
9. `GameScreen.tsx` — CSS grid layout: ScoreBar (HTML) + Board (SVG) + Rack (SVG) + Controls (HTML)
10. `ScoreBar.tsx` (HTML), `MoveControls.tsx` (HTML), `TurnNotice.tsx` (HTML+GSAP)
11. GSAP animations: tile snap, rack hover/lift, premium square activation, score popup, word highlight sweep
12. Auto-zoom on placement (pan first, then zoom, after dragEnd)
13. `prefers-reduced-motion` support
14. ARIA labels on interactive SVG elements
15. Keyboard navigation (desktop): arrow keys + Enter
16. **Playwright integration tests** for drag, zoom, pinch, coordinate conversion
17. Local pass-and-play working end-to-end

### Phase 4: Dictionary Validation (Multi-Language) — CRITICAL PATH
1. Prepare versioned gzipped word lists in `public/dictionaries/`
2. `dictionary.worker.ts` — Web Worker for decompress + Set building
3. `lib/dictionary.ts` + `useDictionary.ts` — load per-language Sets
4. `WordFeedback.tsx` — language code badges `[EN]` `[DE]` next to score float
5. Real-time valid word green border
6. Loading state: determinate progress bar during dictionary fetch
7. For Capacitor builds: bundle dictionaries in app assets
8. `game-action` Edge Function: server-side dictionary validation (bundled dicts, cached in global memory, lazy-loaded per game language)

### Phase 5: Supabase Online Play + Multiple Games
1. Edge Functions: `create-game`, `join-game`, `game-action` (combined submit/exchange/pass with `SELECT FOR UPDATE`), `get-hand`, `finish-game`
2. Structured logging in all Edge Functions (game_id, user_id, action, success/failure, latency)
3. `useGameSync.ts` — Realtime on single game + reconnection with full state refetch
4. `useGamesList.ts` — two Realtime subscriptions (player1_id + player2_id)
5. `HomeScreen` games list with time-since-last-move, accent border for your-turn, finished games collapsed
6. `CreateGame.tsx` — language multi-select, 8-char join code with share button
7. `JoinGame.tsx` — enter join code (rate limited: 10 attempts/min)
8. Submit button: loading state for Edge Function cold starts
9. Turn transition animations (opponent tiles stagger in, word sweep, score counter, "Your Turn" banner)
10. Tile draw-from-bag animation on new tiles received
11. Opponent "thinking" breathing pulse
12. Multiple concurrent games, each with its own language set
13. **Playwright integration tests**: two-tab real-time sync

### Phase 6: Push Notifications — START EARLY
APNs requires Apple portal configuration. Cannot be fixed with code.

1. `useNotifications.ts` — register (Web Push VAPID / Capacitor APNs)
2. Notification sending inlined in `game-action` Edge Function (try/catch, not separate function)
3. Handle APNs error codes (`BadDeviceToken`, `Unregistered`) — delete stale tokens
4. Token cleanup: prune tokens that repeatedly fail delivery
5. Max 5 tokens per user (prevent token-stuffing)
6. VAPID keys in Supabase secrets, APNs `.p8` key in Supabase secrets

### Phase 7: PWA + Capacitor
1. `vite-plugin-pwa` — StaleWhileRevalidate for dictionaries (not CacheFirst — enables updates)
2. Service worker install event: precache dictionaries for user's languages
3. Offline mode: view-only. Submit button disabled with "No connection" indicator. No move queuing.
4. Capacitor init + iOS
5. Conditional PWA plugin (disabled for Capacitor builds)
6. Capacitor dictionary caching via Filesystem API (not service worker)
7. Safe area insets, haptics (`@capacitor/haptics`), status bar
8. Code signing + TestFlight distribution
9. Test cross-platform: web PWA ↔ iOS

### Phase 8: Stats
1. `finish-game` Edge Function — iterate `moves` table, check per-language dictionaries for word attribution, update `player_stats` + `player_language_stats`. Idempotent via `stats_computed` flag.
2. Store per-language word attribution at move time in `moves.words_formed` JSONB (language field per word) — so stats don't need dictionary access for re-computation
3. `lib/stats.ts` — pure stat extraction functions
4. `useStats.ts`, `StatsScreen.tsx`, `GameHistory.tsx`, `StatCard.tsx` (GSAP count-up)
5. Account deletion endpoint (GDPR: cascading delete of all user data)

### Phase 9: UX Polish
1. Refined GSAP animations throughout (all specs from Section 9)
2. Game over overlay with confetti
3. Loading states + error handling with smooth transitions
4. Responsive SVG sizing (iPhone SE → desktop), profile on real devices
5. Final Playwright test suite for full game flow

## 12. Potential Problems & Mitigations

| Problem | Mitigation |
|---------|-----------|
| **Cheating** | All move validation in Edge Functions. Client is UI feedback only. Score computed server-side. |
| **Race conditions** | `SELECT FOR UPDATE` + `move_number` optimistic concurrency. Idempotent retries. |
| **Tile privacy** | `game_secrets` DENY ALL RLS. `get-hand` returns only requesting player's tiles. |
| **Move replay/double-submit** | `move_number` check rejects stale/duplicate requests. |
| **Memory leaks** | `gsap.context()` per component + explicit `draggable.kill()`. |
| **Drag "off" on scaled boards** | `getScreenCTM().inverse()`. ViewBox locked during drag. |
| **Gesture conflicts** | State machine with 50ms pinch detection delay. |
| **ViewBox change mid-drag** | ViewBox locked during any active drag. Auto-zoom fires after dragEnd only. |
| **Pinch jank** | CSS transform during gesture (GPU), commit to viewBox on end. |
| **Fat fingers** | Magnifier (separate SVG) + auto-zoom-in. |
| **German umlauts** | Uppercase, dedicated tiles. Dictionary self-enforces valid usage. |
| **Shuffle predictability** | `crypto.getRandomValues()` server-side only. |
| **Edge Function cold starts** | Submit button loading state. Combined `game-action` reduces cold start surface. |
| **Dictionary cache invalidation** | Versioned filenames + StaleWhileRevalidate (not CacheFirst). |
| **Dictionary loading blocks UI** | Web Worker for decompress + Set building. |
| **APNs setup** | Start Apple Developer config in Phase 6. Cannot be fixed with code. |
| **Bilingual tile fairness** | Merged tile bag (MAX strategy). |
| **Stale push tokens** | Prune on APNs error codes. `last_used_at` column. |
| **Realtime disconnect** | Refetch full state from Postgres on reconnect. |
| **Join code brute force** | 8 alphanumeric chars (30^8 = 656B). Rate limit 10/min. 30-min expiry. |
| **RLS gaps** | Explicit policy matrix. `games` read-only to clients. All writes via service role. |
| **GDPR** | EU Supabase region. Privacy policy. Account deletion cascade. |
| **No monitoring** | Sentry (client). Structured Edge Function logs. Alerting on failures. |
| **Adding languages** | New dict file + tile constants. `player_language_stats` + `games.languages[]` need no migration. |

## 13. Pre-Ship Checklist

- [ ] Service role key exists ONLY in Edge Function env vars, never in client bundle (grep build output)
- [ ] All RLS policies match the policy matrix (test: attempt direct client writes → rejected)
- [ ] `game_secrets` DENY ALL verified (subscribe to Realtime on game_secrets → no events)
- [ ] `game-action` uses `SELECT FOR UPDATE` + `move_number` check
- [ ] Merged tile bag uses MAX strategy, `crypto.getRandomValues()` for shuffle
- [ ] Dictionary validates words against all game languages, server-side authoritative
- [ ] Client + server dictionary versions match (content hash)
- [ ] SVG coord conversion works at all zoom levels (Playwright tests)
- [ ] Gesture state machine handles all touch scenarios (Playwright touch tests)
- [ ] ViewBox locked during drag
- [ ] `gsap.context()` + `draggable.kill()` in every component with animations
- [ ] `prefers-reduced-motion` disables animations
- [ ] ARIA labels on interactive SVG elements
- [ ] Keyboard navigation works on desktop
- [ ] Join code: 8 chars, rate limited, expires after 30 min
- [ ] Push notifications: stale token cleanup, max 5 per user
- [ ] Offline: submit disabled with "No connection" indicator
- [ ] Privacy policy accessible, account deletion works (cascading)
- [ ] Supabase hosted in EU region
- [ ] Sentry capturing client errors
- [ ] Edge Function logs: structured, include game_id + user_id
- [ ] Profile performance on iPhone SE

## Supabase Free Tier Budget
- 500MB DB: ~5KB per game + ~100B per move → ample
- 2GB bandwidth: Realtime + API calls. Monitor actual usage.
- Realtime: 200 concurrent (2 subs per open app × N users — monitor)
- Edge Functions: 500K invocations/month
- **Cost: $0 at low scale.** Pro tier ($25/month) needed if >50 concurrent users.

## Verification
- **Phase 0:** Spike passes — drag works at all zoom levels in React 19
- **Phase 1:** Two accounts registered, CI pipeline green, Sentry receiving events
- **Phase 2:** `npm test` — all game logic passes, merged bag correct, pending moves buffer works
- **Phase 3:** Full local game via drag; gesture state machine handles all touch combos; Playwright passes
- **Phase 4:** "HAND" → valid in EN+DE (both badges, green border). "ZZZZZ" → no green border. Server validates independently.
- **Phase 5:** Two tabs real-time, concurrent games, `game_secrets` hidden, turn transitions animate, reconnection works
- **Phase 6:** Submit move → opponent gets push notification (web + iOS)
- **Phase 7:** PWA installable, iOS builds via TestFlight, cross-platform game works, offline shows "no connection"
- **Phase 8:** Stats per-language word counts correct, game history browsable, account deletion cascades
- **Phase 9:** Animations polished, responsive on iPhone SE through desktop
- **All phases:** `npm test` + Playwright passes
