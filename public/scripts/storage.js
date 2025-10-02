import { createProject, createScene, createChoice, SceneType } from './model.js';

// Import/Export (JSON). IndexedDB stubbed for now.
export async function importProject(store, file) {
  const text = await file.text();
  const json = JSON.parse(text);
  const sceneData = Array.isArray(json.scenes) ? json.scenes.slice(0, 20) : [];
  const base = createProject({ ...json, scenes: sceneData });

  const cleanedScenes = base.scenes.map(scene => {
    const imported = createScene(scene);
    imported.image = null;
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

  store.set({ project });
}

export async function exportProject(store) {
  const data = store.get().project;
  const serialised = {
    meta: { ...data.meta },
    scenes: data.scenes.map(scene => ({
      id: scene.id,
      type: scene.type,
      image: scene.image ? { name: scene.image.name || '' } : null,
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
}
