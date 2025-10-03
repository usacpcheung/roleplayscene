# RolePlayScene

RolePlayScene is a browser-only builder for compact branching role-play stories. Authors can outline up to **20 scenes** (with exactly **1 Start** and up to **3 Ends**), attach imagery and background audio, script short dialogue exchanges, and wire choices or auto-advance transitions—all without a backend. Projects live entirely on the client: edits persist to IndexedDB, manual exports produce a zipped archive containing media, and imports accept both those archives and legacy JSON snapshots.

## Current capabilities
### Story authoring (Edit mode)
- **Graph workspace** renders the scene network using an automatic breadth-first layout. Selecting nodes opens the inspector while validation issues surface beside the canvas.
- **Scene editor** lets you:
  - Switch between `Start`, `Intermediate`, and `End` scene types (enforcing the single Start / ≤3 Ends rule).
  - Upload one stage image per scene.
  - Attach a looping background track (any audio MIME type) with remove/replace controls.
  - Script up to **two dialogue lines**, each with optional MP3 narration upload.
  - Add up to **three choices** (label + destination) or configure a single auto-advance target when choices are absent.
  - Manage project metadata (title), add new scenes, and delete existing ones while respecting the 20-scene cap.
- **Validation panel** runs on every change and highlights missing destinations, unreachable scenes, auto-advance conflicts, and other rule violations.

### Story playback (Play mode)
- **Audio gate** ensures the first run begins after an explicit user gesture, satisfying modern autoplay policies.
- **Stage & dialogue renderer** plays scene imagery and steps through dialogue (and per-line narration) automatically; users can replay lines if narration fails.
- **Background music controller** keeps a persistent track across scenes, exposing volume and mute toggles when audio is unlocked.
- **Choice & auto-advance handling** supports branching via buttons, seamless auto-next transitions, and detection of missing scenes.
- **History viewer** maintains the visited scene list with back/forward controls and jump-to-scene navigation for debugging or quick playthroughs.

### Persistence & portability
- **Autosave**: all changes debounce into IndexedDB; friendly status messages warn if the browser blocks storage or previously saved data cannot be read.
- **Import**: accepts `.zip` archives that include `project.json` and binary media (packed via [fflate](public/scripts/vendor/fflate.module.js)) or raw JSON snapshots, hydrating blobs back into fresh `objectURL`s.
- **Export**: packages the current project into a `.zip` archive (`project.json` manifest + media files) ready to download, then reseeds IndexedDB with the exported snapshot to keep browser storage aligned.

### Accessibility & UX
- Keyboard focus management across the editor, inspector, and player panels.
- Visible focus states and semantic markup for controls (including history navigation and validation summaries).
- Audio captions through always-present dialogue text.
- Touch-friendly targets for graph nodes, buttons, and sliders.

## Architecture at a glance
- **Vanilla ES modules** served statically from `/public`; no bundler or build step.
- **State management** via a simple `Store` (immutable-ish updates + subscriptions) in [`public/scripts/state.js`](public/scripts/state.js).
- **Domain model** definitions, factories, and migrations in [`model.js`](public/scripts/model.js).
- **Editor modules** (`editor/`) cover the graph renderer, inspector form logic, validation utilities, and shared DOM helpers.
- **Player modules** (`player/`) provide the runtime state machine, audio controllers, dialogue sequencing, and UI composition.
- **Persistence layer** (`storage.js`) bridges IndexedDB autosave, import/export, and archive assembly.
- **Utilities** house small helpers (`dom`, `id`, `zip`) plus the vendored fflate module for ZIP handling.

A typical repository layout looks like:
```
public/
  index.html
  styles/
    app.css
  scripts/
    main.js              # bootstrap + mode switching
    state.js             # store implementation
    model.js             # schema + factories
    storage.js           # IndexedDB + import/export
    editor/
      editor.js          # edit-mode controller + graph wiring
      graph.js           # layout + SVG rendering
      inspector.js       # scene form + validation renderers
      validators.js      # structural rules + reachability checks
    player/
      player.js          # runtime state machine + audio
      audio.js           # autoplay gate + background mixer
      ui.js              # stage/dialogue/choice/history rendering
    utils/
      dom.js, id.js, zip.js
    vendor/
      fflate.module.js   # ZIP compression/decompression
```

## Data model snapshot
```js
{
  meta: { title: 'My Role Play', version: 1 },
  scenes: [{
    id: 'scene-001',
    type: 'start' | 'intermediate' | 'end',
    image: { name, objectUrl, blob } | null,
    backgroundAudio: { name, objectUrl, blob } | null,
    dialogue: [{ text, audio: { name, objectUrl, blob } | null }],
    choices: [{ id, label, nextSceneId }],
    autoNextSceneId: null | 'scene-002',
    notes: ''
  }],
  assets: []
}
```

Serialized exports upgrade this shape into a manifest:
```json
{
  "manifestVersion": 1,
  "project": {
    "meta": { "title": "My Role Play", "version": 1 },
    "scenes": [{
      "id": "scene-001",
      "type": "start",
      "image": {
        "name": "start.png",
        "type": "image/png",
        "size": 34567,
        "path": "media/scene-1/image.png"
      },
      "backgroundAudio": null,
      "dialogue": [{
        "text": "Hello!",
        "audio": {
          "name": "hello.mp3",
          "type": "audio/mpeg",
          "size": 78901,
          "path": "media/scene-1/dialogue-1.mp3"
        }
      }],
      "choices": [{ "id": "choice-1", "label": "Yes", "nextSceneId": "scene-002" }],
      "autoNextSceneId": null,
      "notes": ""
    }],
    "assets": []
  }
}
```
Binary files referenced via `path` sit alongside `project.json` within the archive.

## Running locally
1. Install a modern Node.js runtime (18+) to execute unit tests.
2. Serve the `/public` directory using any static file server, e.g. `npx http-server public -p 4173` or `python -m http.server 4173 --directory public`.
3. Visit `http://localhost:4173` in a supported browser (latest Chrome, Edge, Firefox, Safari). iOS Safari will prompt for the initial audio unlock gesture.

## Testing
- Execute all unit tests with:
  ```sh
  for f in tests/*.test.mjs; do
    echo "Running $f"
    node "$f"
  done
  ```
- Coverage spans graph layout, validators (including auto-advance constraints), storage/IndexedDB adapters, and the player’s background audio + playback controls.

## Security & privacy
- No network calls or external analytics; everything remains client-side.
- Media files never leave the browser.
- Export/download interactions run via temporary `objectURL`s that are revoked immediately after use.

## Roadmap
1. **Editor quality-of-life** – drag-to-reposition nodes, inline scene notes, and keyboard shortcuts for faster authoring.
2. **Undo/redo history** – transactional store updates and UI affordances for reversing recent edits.
3. **Richer exports** – optional single-file HTML player alongside ZIP, plus metadata for branching analytics.
4. **Offline readiness** – lightweight PWA manifest/service worker to allow installable offline editing (while respecting storage limits).
5. **Media management** – bulk asset inspector with warnings for oversized audio/images and tools to relink missing media.
