import { createProject, createScene, createChoice, SceneType } from './model.js';

const DB_NAME = 'roleplayscene';
const DB_VERSION = 1;
const PROJECT_STORE = 'project';
const PROJECT_KEY = 'snapshot';
const SAVE_DEBOUNCE_MS = 500;

function noop() {}

function isIndexedDBAvailable() {
  return typeof globalThis !== 'undefined'
    && typeof globalThis.indexedDB !== 'undefined';
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE);
      }
    };
    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function withStore(db, mode, fn) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(PROJECT_STORE, mode);
      const store = tx.objectStore(PROJECT_STORE);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    } catch (err) {
      reject(err);
    }
  });
}

function readSnapshot(db) {
  return withStore(db, 'readonly', store => store.get(PROJECT_KEY));
}

function writeSnapshot(db, data) {
  return withStore(db, 'readwrite', store => store.put(data, PROJECT_KEY));
}

function safeCreateObjectURL(blob) {
  if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }
  try {
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Failed to create object URL from blob', err);
    return null;
  }
}

function safeRevokeObjectURL(url) {
  if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
    return;
  }
  try {
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('Failed to revoke object URL', err);
  }
}

export function revokeProjectObjectUrls(project) {
  if (!project || !Array.isArray(project.scenes)) return;
  project.scenes.forEach(scene => {
    if (scene.image?.objectUrl) {
      safeRevokeObjectURL(scene.image.objectUrl);
    }
    if (scene.backgroundAudio?.objectUrl) {
      safeRevokeObjectURL(scene.backgroundAudio.objectUrl);
    }
    if (Array.isArray(scene.dialogue)) {
      scene.dialogue.forEach(line => {
        if (line.audio?.objectUrl) {
          safeRevokeObjectURL(line.audio.objectUrl);
        }
      });
    }
  });
}

export function serializeProject(project) {
  if (!project) return null;
  const scenes = Array.isArray(project.scenes) ? project.scenes.slice(0, 20) : [];
  return {
    meta: { ...project.meta },
    scenes: scenes.map(scene => {
      const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : [];
      const choices = Array.isArray(scene.choices) ? scene.choices : [];
      return {
        id: scene.id,
        type: scene.type,
        image: scene.image ? { name: scene.image.name ?? '', blob: scene.image.blob ?? null } : null,
        backgroundAudio: scene.backgroundAudio
          ? { name: scene.backgroundAudio.name ?? '', blob: scene.backgroundAudio.blob ?? null }
          : null,
        dialogue: dialogue.map(line => ({
          text: line.text ?? '',
          audio: line.audio
            ? { name: line.audio.name ?? '', blob: line.audio.blob ?? null }
            : null,
        })),
        choices: choices.map(choice => ({
          id: choice.id,
          label: choice.label,
          nextSceneId: choice.nextSceneId ?? null,
        })),
        autoNextSceneId: scene.autoNextSceneId ?? null,
        notes: scene.notes ?? '',
      };
    }),
    assets: Array.isArray(project.assets) ? project.assets.slice() : [],
  };
}

export function hydrateProject(serialized, { previousProject = null } = {}) {
  if (!serialized) {
    return createProject();
  }

  if (previousProject) {
    revokeProjectObjectUrls(previousProject);
  }

  const scenes = Array.isArray(serialized.scenes) ? serialized.scenes : [];
  const preparedScenes = scenes.map(scene => {
    const imageBlob = scene.image?.blob ?? null;
    const bgBlob = scene.backgroundAudio?.blob ?? null;
    const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : [];
    return {
      id: scene.id,
      type: scene.type ?? SceneType.INTERMEDIATE,
      image: scene.image
        ? {
          name: scene.image.name ?? '',
          blob: imageBlob,
          objectUrl: imageBlob ? safeCreateObjectURL(imageBlob) : null,
        }
        : null,
      backgroundAudio: scene.backgroundAudio
        ? {
          name: scene.backgroundAudio.name ?? '',
          blob: bgBlob,
          objectUrl: bgBlob ? safeCreateObjectURL(bgBlob) : null,
        }
        : null,
      dialogue: dialogue.map(line => {
        const audioBlob = line.audio?.blob ?? null;
        return {
          text: line.text ?? '',
          audio: line.audio
            ? {
              name: line.audio.name ?? '',
              blob: audioBlob,
              objectUrl: audioBlob ? safeCreateObjectURL(audioBlob) : null,
            }
            : null,
        };
      }),
      choices: Array.isArray(scene.choices) ? scene.choices.map(choice => ({
        id: choice.id,
        label: choice.label ?? '',
        nextSceneId: choice.nextSceneId ?? null,
      })) : [],
      autoNextSceneId: scene.autoNextSceneId ?? null,
      notes: scene.notes ?? '',
    };
  });

  return createProject({
    meta: serialized.meta,
    scenes: preparedScenes.map(scene => createScene(scene)),
    assets: Array.isArray(serialized.assets) ? serialized.assets.slice() : [],
  });
}

async function reseedPersistence(project) {
  if (!project || !isIndexedDBAvailable()) return;
  const snapshot = serializeProject(project);
  if (!snapshot) return;
  let db;
  try {
    db = await openDatabase();
    await writeSnapshot(db, snapshot);
  } catch (err) {
    console.warn('Failed to reseed IndexedDB after manual import/export', err);
  } finally {
    if (db) db.close();
  }
}

export async function setupPersistence(store, { showMessage = noop } = {}) {
  if (!isIndexedDBAvailable()) {
    if (typeof showMessage === 'function') {
      showMessage('Autosave disabled: IndexedDB not supported.');
    }
    return noop;
  }

  let db;
  try {
    db = await openDatabase();
  } catch (err) {
    console.error('Failed to open IndexedDB', err);
    if (typeof showMessage === 'function') {
      showMessage('Autosave disabled: unable to open browser storage.');
    }
    return noop;
  }

  let disabled = false;
  let applyingSnapshot = false;
  let debounceHandle = null;

  const notify = typeof showMessage === 'function' ? showMessage : noop;

  async function loadSnapshot() {
    try {
      const snapshot = await readSnapshot(db);
      if (snapshot) {
        applyingSnapshot = true;
        try {
          const hydrated = hydrateProject(snapshot, { previousProject: store.get().project });
          store.set({ project: hydrated });
        } finally {
          applyingSnapshot = false;
        }
      }
    } catch (err) {
      console.error('Failed to read persisted project', err);
      notify('Autosave disabled: unable to read saved project.');
      disabled = true;
    }
  }

  await loadSnapshot();

  async function persistNow() {
    if (disabled) return;
    try {
      const { project } = store.get();
      await writeSnapshot(db, serializeProject(project));
    } catch (err) {
      console.error('Failed to persist project', err);
      if (!disabled) {
        notify('Autosave disabled: storage error.');
      }
      disabled = true;
    }
  }

  function scheduleSave() {
    if (disabled || applyingSnapshot) return;
    if (debounceHandle) {
      clearTimeout(debounceHandle);
    }
    debounceHandle = setTimeout(() => {
      debounceHandle = null;
      persistNow().catch(err => {
        console.error('Autosave failed', err);
      });
    }, SAVE_DEBOUNCE_MS);
  }

  const unsubscribe = store.subscribe(() => {
    scheduleSave();
  });

  return () => {
    if (debounceHandle) {
      clearTimeout(debounceHandle);
      debounceHandle = null;
    }
    unsubscribe();
    if (db) {
      db.close();
    }
  };
}

export async function importProject(store, file) {
  const text = await file.text();
  const json = JSON.parse(text);
  const sceneData = Array.isArray(json.scenes) ? json.scenes.slice(0, 20) : [];
  const base = createProject({ ...json, scenes: sceneData });

  const cleanedScenes = base.scenes.map(scene => {
    const imported = createScene(scene);
    imported.image = null;
    imported.backgroundAudio = null;
    imported.dialogue = imported.dialogue.map(line => ({ text: line.text || '', audio: null }));
    imported.choices = imported.choices.map(choice => createChoice({
      id: choice.id,
      label: choice.label,
      nextSceneId: choice.nextSceneId ?? null,
    }));
    const candidateAutoNext = scene.autoNextSceneId ?? null;
    imported.autoNextSceneId = imported.type === SceneType.END ? null : candidateAutoNext;
    return imported;
  });

  const project = {
    meta: { ...base.meta },
    scenes: cleanedScenes,
    assets: [],
  };

  const previous = store.get().project;
  revokeProjectObjectUrls(previous);
  store.set({ project });
  await reseedPersistence(project);
}

export async function exportProject(store) {
  const data = store.get().project;
  const serialised = {
    meta: { ...data.meta },
    scenes: data.scenes.map(scene => ({
      id: scene.id,
      type: scene.type,
      image: scene.image ? { name: scene.image.name || '' } : null,
      backgroundAudio: scene.backgroundAudio ? { name: scene.backgroundAudio.name || '' } : null,
      dialogue: scene.dialogue.map(line => ({
        text: line.text,
        audio: line.audio ? { name: line.audio.name || '' } : null,
      })),
      choices: scene.choices.map(choice => ({
        id: choice.id,
        label: choice.label,
        nextSceneId: choice.nextSceneId ?? null,
      })),
      autoNextSceneId: scene.autoNextSceneId ?? null,
      notes: scene.notes || '',
    })),
    assets: [],
  };

  const json = JSON.stringify(serialised, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.meta?.title || 'roleplay') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  await reseedPersistence(data);
}
