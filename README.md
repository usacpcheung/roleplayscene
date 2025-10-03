# RolePlayScene (client-side branching story builder)

A 100% front-end tool (HTML/CSS/JS) for building and playing simple branching role-play stories. Creators can define up to **20 scenes** (exactly **1 Start**, up to **3 Endings**, the rest Intermediate). Each scene supports **1 image**, **up to 2 dialogue lines** (each may include optional audio), and **up to 3 response choices** that branch to other scenes. No server—everything runs in the browser. Projects export to a **self-contained `.zip` archive** (with media + manifest) and can still import legacy `.json` files; state is also **autosaved** to IndexedDB while you work.

## ✨ Features
- **Edit Mode**: graph canvas + inspector to add scenes, set Start/End, upload image/MP3s, author dialogue & choices, connect branches.
- **Play Mode**: left **Stage** shows scene image; right **Dialogue** auto-steps lines (with audio); then shows choices to branch.
- **Validation**: exactly 1 Start; ≤3 Endings; ≤20 scenes; no broken links; warns on unreachable scenes.
- **Storage**: Autosave to IndexedDB with graceful fallbacks; manual export creates a `.zip` archive (manifest + binary media) while import accepts both `.zip` and legacy `.json` snapshots.
- **Privacy**: all processing happens locally in the browser.
- **Mobile friendly**: touch targets, iOS autoplay guard (“Start Playback”).
- **A11y**: keyboard navigation, visible focus, text captions with audio.

## 🧱 Tech & architecture
- **No build required**: vanilla ES modules + CSS.
- **Local preview**: any static file server (e.g. `npx http-server public -p 4173`).
- **Data**: project state kept in memory and mirrored to IndexedDB; export produces a zipped archive (`project.json` manifest + binary media) and import accepts both the archive and JSON snapshots.
- **Audio**: HTMLAudio (simple) with user-gesture gate; can upgrade to Web Audio API for fine control later.
- **Graph**: lightweight node/edge model; pan/zoom canvas.

### Suggested directory layout
```
/public
  index.html
  /assets       # optional static icons/fonts (not user media)
  /styles
    app.css
  /scripts
    main.js            # entry, mode switching, global events
    state.js           # app state store, pub/sub
    model.js           # schema, validators, migrations
    storage.js         # IndexedDB adapter + import/export (JSON)
    editor/
      editor.js        # edit mode controller
      graph.js         # graph canvas (render, pan/zoom, hit test)
      inspector.js     # scene form (image/mp3 upload, dialogue, choices)
      validators.js    # constraints, reachability, broken links
    player/
      player.js        # play mode runtime, scene transitions
      audio.js         # audio gate, preload, play/stop helpers
      ui.js            # stage + dialogue panel rendering
    utils/
      dom.js, id.js, throttle.js
/tests
  unit/                # model, validators, transitions
  e2e/                 # playthroughs to endings
```

## 🗃️ Data model snapshot

### In-memory project shape
```js
{
  meta: { title: 'My Role Play', version: 1 },
  scenes: [{
    id: 'scene-001',
    type: 'start' | 'intermediate' | 'end',
    image: {
      name: 'start.png',
      objectUrl: 'blob:https://…',
      blob: File | Blob | null,
    } | null,
    backgroundAudio: {
      name: 'loop.mp3',
      objectUrl: 'blob:https://…',
      blob: File | Blob | null,
    } | null,
    dialogue: [{
      text: 'Hello!',
      audio: {
        name: 'hello.mp3',
        objectUrl: 'blob:https://…',
        blob: File | Blob | null,
      } | null,
    }],
    choices: [{ id: 'choice-1', label: 'Yes', nextSceneId: 'scene-002' }],
    autoNextSceneId: null,
    notes: '',
  }],
  assets: [],
}
```

### Serialized for persistence / export
- **Autosave / legacy export**: persists the pre-existing JSON snapshot (media references contain names only).
- **`.zip` export**: creates an archive with `project.json` + binary assets.

`project.json` acts as a manifest:

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

For each manifest entry with a `path`, the archive includes a binary file at that path. Asset sizes therefore equal the sum of all blobs (plus a few KB for JSON/ZIP overhead). When exporting or importing large media bundles the UI displays “Preparing export…” / “Importing project…” statuses so users know the operation is still running.

## ✅ Validation rules
- Exactly **1** scene marked `type = "start"`.
- **0–3** scenes marked `type = "end"`.
- **1–20** total scenes.
- Each choice must reference an existing `nextSceneId`.
- Every non-Start scene must be reachable from Start.
- End scenes cannot have outgoing choices.

## 🧭 User flows
**Edit Mode** → create scenes, mark Start/End, add dialogue (≤2 lines), add choices (≤3), connect edges, Validate, Save/Export.  
**Play Mode** → Start Playback → show image & dialogue (with audio) → show choices → transition → reach End.

## 🔈 Audio considerations
Autoplay is gated by a user gesture; provide Mute/Unmute and Replay controls; preload next scene assets.

## ♿ Accessibility
Keyboard navigation, focus styles, ARIA roles, visible captions.

## 📱 Browser support
Latest Chrome/Edge/Firefox/Safari. iOS Safari requires an initial tap for audio.

## 🚀 Getting started (dev)
1. Install a recent Node.js runtime (18+) for running tests.
2. Start a static server from the repo root, e.g. `npx http-server public -p 4173` or `python -m http.server 4173 --directory public`.
3. Visit `http://localhost:4173` and the app will boot into Edit mode after setting up persistence.

## 🧪 Testing
- Run all unit tests: `for f in tests/*.test.mjs; do echo "Running $f"; node "$f"; done`
- Key coverage includes model helpers, validators, and IndexedDB serialization/hydration round-trips.

## 🔒 Security & privacy
No network calls; media handled locally; warn on export.

## 🗺️ Roadmap
PWA, undo/redo, graph screenshot, shareable self-contained HTML player, local analytics.

## 📄 License
MIT (tbd by repository owner).
