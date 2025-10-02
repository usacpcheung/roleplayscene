# RolePlayScene (client-side branching story builder)

A 100% front-end tool (HTML/CSS/JS) for building and playing simple branching role-play stories. Creators can define up to **20 scenes** (exactly **1 Start**, up to **3 Endings**, the rest Intermediate). Each scene has **1 image**, **up to 2 dialogue lines** (each may include an **MP3**), and **up to 3 response choices** that branch to other scenes. No server—everything runs in the browser, and projects can be **exported/imported** as JSON (optionally zipped with assets).

## ✨ Features
- **Edit Mode**: graph canvas + inspector to add scenes, set Start/End, upload image/MP3s, author dialogue & choices, connect branches.
- **Play Mode**: left **Stage** shows scene image; right **Dialogue** auto-steps lines (with audio); then shows choices to branch.
- **Validation**: exactly 1 Start; ≤3 Endings; ≤20 scenes; no broken links; warns on unreachable scenes.
- **Storage**: IndexedDB for in-browser work; export/import to JSON (or ZIP).
- **Privacy**: all processing happens locally in the browser.
- **Mobile friendly**: touch targets, iOS autoplay guard (“Start Playback”).
- **A11y**: keyboard navigation, visible focus, text captions with audio.

## 🧱 Tech & architecture
- **No build required**: vanilla ES modules + CSS.
- **Optional dev tooling**: Vite for local preview and PWA later.
- **Data**: project state kept in memory and mirrored to IndexedDB; export to JSON (optionally base64-embedding or zipped).
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
    storage.js         # IndexedDB adapter + import/export (JSON/ZIP)
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

## 🗃️ Data model (JSON overview)
```json
{
  "meta": { "title": "My Role Play", "version": 1 },
  "scenes": [{
    "id": "scene-001",
    "type": "start|intermediate|end",
    "image": { "name": "start.png", "blobId": "img-abc", "width": 0, "height": 0 },
    "dialogue": [
      { "text": "Hello!", "audio": { "name": "hello.mp3", "blobId": "aud-001", "duration": 0 } },
      { "text": "Are you ready?", "audio": { "name": "ready.mp3", "blobId": "aud-002", "duration": 0 } }
    ],
    "choices": [
      { "id": "choice-1", "label": "Yes", "nextSceneId": "scene-002" },
      { "id": "choice-2", "label": "No", "nextSceneId": "scene-003" }
    ],
    "notes": ""
  }],
  "assets": [
    { "id": "img-abc", "type": "image/png" },
    { "id": "aud-001", "type": "audio/mpeg" }
  ]
}
```

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
- Option A: open `public/index.html` directly.
- Option B (recommended): use a local static server or Vite for fast reload.

## 🧪 Testing
Unit (validators, transitions), Integration (import/export, audio gate), E2E (playthroughs).

## 🔒 Security & privacy
No network calls; media handled locally; warn on export.

## 🗺️ Roadmap
PWA, undo/redo, graph screenshot, shareable self-contained HTML player, local analytics.

## 📄 License
MIT (tbd by repository owner).
