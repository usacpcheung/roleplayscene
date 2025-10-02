# Agents Guide (for AI code assistants)

**Goal**: Maintain and extend a client-side branching story builder. Keep dependencies minimal, preserve portability (static hosting), and enforce constraints (1 Start, ≤3 Endings, ≤20 scenes).

## Project boundaries & principles
1. **Client-only**: Do not add back-end services. All features must work on static hosting.
2. **Storage**: Use IndexedDB (via `storage.js`) for blobs and state; support JSON/ZIP export/import.
3. **Audio**: Respect browser autoplay policies. Always gate audio behind an explicit user gesture.
4. **Graph integrity**: Editors must prevent/flag invalid links; player must never crash on malformed data.
5. **Perf**: Target ≤20 scenes; prefer simple algorithms, avoid heavy libraries.
6. **A11y**: Don’t regress keyboard navigation or focus visibility. Maintain text captions for all audio.

## File map & responsibilities
- `scripts/main.js`: app bootstrap, route/edit/play mode switching, global events.
- `scripts/state.js`: central store (immutable-ish updates), event pub/sub.
- `scripts/model.js`: schema, factories, migration, serialization.
- `scripts/storage.js`: IndexedDB helpers; import/export (JSON & ZIP if enabled).
- `scripts/editor/editor.js`: edit mode controller, toolbar actions.
- `scripts/editor/graph.js`: render nodes/edges; pan/zoom; selection; edge creation.
- `scripts/editor/inspector.js`: scene form (uploads, dialogue, choices).
- `scripts/editor/validators.js`: structural rules & reachability.
- `scripts/player/player.js`: runtime state machine.
- `scripts/player/audio.js`: preloading, play/stop, global mute; autoplay gate.
- `scripts/player/ui.js`: stage + dialogue and choices rendering.
- `scripts/utils/*`: helpers only.

## Coding standards
ES modules; kebab-case filenames; JSDoc comments; minimal deps; UI strings via a simple i18n map.

## Validation constraints
- Exactly one Start scene.
- 0–3 End scenes.
- Max 20 scenes.
- Choices: 0–3 per scene; `nextSceneId` must exist.
- Reachability: warn for any scene not reachable from Start.
- End scenes have zero outgoing choices.

## Acceptance criteria (per feature)
- Tests updated/added.
- A11y intact (keyboard + focus).
- No perf regression on a 20-scene project with ~10MB media.
- State persists; import/export round-trip works.
- No network calls.

## Audio policy checklist
User gesture before first `play()`; handle promise rejections; provide Mute and Replay.

## Starter backlog
1. Scaffold `index.html`, base layout (Edit/Play toggle).
2. State & model: schema + validators + unit tests.
3. Editor MVP: graph (MVP), inspector form, choice linking, validation UI.
4. Player MVP: scene renderer, dialogue sequencer, choices, audio gate.
5. Storage MVP: IndexedDB; JSON export/import.
6. Tests: validators, transitions, import/export round-trip.
