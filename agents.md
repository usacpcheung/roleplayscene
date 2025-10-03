# Agents Guide (for AI code assistants)

**Mission**: Maintain and extend the client-side branching story builder. Keep the app deployable as plain static assets, preserve author/editor ergonomics, and respect tight constraints: 1 Start scene, ≤3 End scenes, ≤20 total scenes, choices ≤3, dialogue lines ≤2. Autosave, import/export, and playback must continue to function even when browsers restrict features.

## Core guardrails
1. **Client-only** – Never add backend dependencies or non-static hosting requirements. All features must run from `/public` using vanilla ES modules.
2. **Storage** – Use IndexedDB (via `storage.js`) for autosave. Manual import/export already supports JSON and ZIP (`project.json` + binaries using fflate); keep parity between formats when evolving the schema.
3. **Media handling** – Images/audio are stored as blobs with regenerated `objectURL`s. Revoke/recreate URLs when replacing assets to avoid leaks.
4. **Graph integrity** – Editors must prevent or surface invalid links. Player mode must degrade gracefully (showing warnings instead of crashing) when encountering malformed data.
5. **Performance** – Optimise for ≤20 scenes with ~10 MB of media. Avoid heavyweight dependencies or expensive layout algorithms.
6. **Accessibility** – Preserve keyboard navigation, focus visibility, semantic labels, and captioned dialogue. Any new controls require accessible names/states.
7. **Audio policy** – All playback follows a user gesture gate (`audioGate`). Handle `play()` rejections, provide mute/volume controls, and keep captions in sync.
8. **Documentation** – Keep `README.md` and this guide aligned with implemented behaviour whenever features change.

## Module responsibilities
- `scripts/main.js` – App bootstrap, mode switching, global messaging.
- `scripts/state.js` – Store implementation (immutable-style updates + subscriptions).
- `scripts/model.js` – Schema, factories, migrations, and validation helpers.
- `scripts/storage.js` – IndexedDB autosave, archive import/export, manifest assembly.
- `scripts/editor/*` – Graph layout/rendering, inspector form, toolbar actions, validation UI.
- `scripts/player/*` – Runtime state machine, dialogue sequencing, background audio mixer, UI composition.
- `scripts/utils/*` – Small helpers (DOM, IDs, ZIP promise wrappers).
- `scripts/vendor/fflate.module.js` – Third-party compression library; do not replace unless necessary for compatibility.

## Persistence expectations
- Autosave hydrates any stored snapshot during bootstrap, debounces writes, and surfaces clear messages when persistence is disabled or fails mid-session.
- Import/export must reseed IndexedDB so manual actions keep autosave in sync with the downloaded/uploaded snapshot.
- Serialized snapshots store `Blob` metadata; hydration must create fresh `objectURL`s for restored assets.

## Validation & gameplay rules
- Exactly 1 Start scene; 0–3 End scenes; 1–20 total scenes.
- Choices: 0–3 per scene. Each `nextSceneId` must exist.
- Auto-advance targets only when no choices are present and never from End scenes.
- Reachability: warn for scenes unreachable from Start.
- End scenes cannot offer playable choices.
- Player history/navigation must remain consistent after edits, imports, or auto-advance transitions.

## Testing
- Run `for f in tests/*.test.mjs; do echo "Running $f"; node "$f"; done` when touching logic.
- Update or add tests for serialization, validation, graph layout, audio gating, or player history changes.

## Acceptance checklist for feature work
- Tests updated/added and passing.
- A11y preserved (keyboard + focus indicators).
- No regressions in autosave/import/export flows.
- No network calls or backend dependencies introduced.
- Performance remains smooth on the 20-scene benchmark project (~10 MB media).

## Known follow-up initiatives
1. Editor UX polish (drag-to-reposition nodes, inline scene notes, keyboard shortcuts).
2. Undo/redo support in the store and UI.
3. Optional single-file HTML export in addition to ZIP.
4. Offline/PWA support while respecting storage budgets.
5. Media management tooling (size warnings, relink helpers).
