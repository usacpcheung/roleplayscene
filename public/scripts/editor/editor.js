import { renderGraph } from './graph.js';
import { renderInspector } from './inspector.js';
import { validateProject } from './validators.js';
import { createScene, SceneType } from '../model.js';

export function renderEditor(store, leftEl, rightEl, setStatus) {
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  const graphHost = document.createElement('div');
  graphHost.className = 'graph-container';
  leftEl.appendChild(graphHost);

  const inspectorHost = document.createElement('div');
  rightEl.appendChild(inspectorHost);

  let selectedId = store.get().project.scenes[0]?.id ?? null;
  let validationResults = null;

  const unsubscribe = store.subscribe(() => {
    validationResults = null;
    syncSelection();
    update();
  });

  function cleanup() {
    unsubscribe();
  }

  function syncSelection() {
    const { project } = store.get();
    if (!project.scenes.some(scene => scene.id === selectedId)) {
      selectedId = project.scenes[0]?.id ?? null;
    }
  }

  function mutateProject(mutator) {
    const project = store.get().project;
    const next = mutator(project);
    store.set({ project: next });
  }

  function cloneScene(scene) {
    return {
      ...scene,
      dialogue: scene.dialogue.map(line => ({
        text: line.text,
        audio: line.audio ? { ...line.audio } : null,
      })),
      choices: scene.choices.map(choice => ({ ...choice })),
    };
  }

  function update() {
    const { project } = store.get();
    const scene = project.scenes.find(s => s.id === selectedId) ?? null;
    const otherStarts = scene
      ? project.scenes.filter(s => s.id !== scene.id && s.type === SceneType.START).length
      : 0;
    const canDeleteScene = Boolean(scene)
      && project.scenes.length > 1
      && (scene.type !== SceneType.START || otherStarts > 0);

    const activeElement = document.activeElement;
    const shouldRestoreFocus = Boolean(activeElement)
      && inspectorHost.contains(activeElement)
      && activeElement.dataset?.focusKey;
    const focusKey = shouldRestoreFocus ? activeElement.dataset.focusKey : null;
    const selectionStart = shouldRestoreFocus && typeof activeElement.selectionStart === 'number'
      ? activeElement.selectionStart
      : null;
    const selectionEnd = shouldRestoreFocus && typeof activeElement.selectionEnd === 'number'
      ? activeElement.selectionEnd
      : null;

    renderGraph(graphHost, project, selectedId, (id) => {
      selectedId = id;
      validationResults = null;
      update();
    });

    renderInspector(inspectorHost, project, scene, {
      onAddScene: addScene,
      onDeleteScene: deleteScene,
      onSetSceneType: setSceneType,
      onSetSceneImage: setSceneImage,
      onAddDialogue: addDialogue,
      onRemoveDialogue: removeDialogue,
      onUpdateDialogueText: updateDialogueText,
      onSetDialogueAudio: setDialogueAudio,
      onAddChoice: addChoice,
      onRemoveChoice: removeChoice,
      onUpdateChoice: updateChoice,
      onValidate: runValidation,
      canDeleteScene,
      validationResults,
    });

    if (focusKey) {
      const nextFocus = inspectorHost.querySelector(`[data-focus-key="${focusKey}"]`);
      if (nextFocus && typeof nextFocus.focus === 'function') {
        nextFocus.focus();
        if (
          selectionStart !== null
          && selectionEnd !== null
          && typeof nextFocus.setSelectionRange === 'function'
          && typeof nextFocus.value === 'string'
        ) {
          const max = nextFocus.value.length;
          const start = Math.max(0, Math.min(selectionStart, max));
          const end = Math.max(0, Math.min(selectionEnd, max));
          nextFocus.setSelectionRange(start, end);
        }
      }
    }
  }

  function addScene() {
    const { project } = store.get();
    if (project.scenes.length >= 20) {
      setStatus('Scene limit reached (20).');
      return;
    }
    const newScene = createScene();
    mutateProject(prev => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    selectedId = newScene.id;
    validationResults = null;
    setStatus(`Added scene ${newScene.id}.`);
  }

  function deleteScene(sceneId) {
    const { project } = store.get();
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const startScenes = project.scenes.filter(s => s.type === SceneType.START);
    if (scene.type === SceneType.START && startScenes.length <= 1) {
      setStatus('Cannot delete the only Start scene.');
      return;
    }
    if (scene.image?.objectUrl) {
      URL.revokeObjectURL(scene.image.objectUrl);
    }
    scene.dialogue.forEach(line => {
      if (line.audio?.objectUrl) {
        URL.revokeObjectURL(line.audio.objectUrl);
      }
    });
    mutateProject(prev => {
      const remaining = prev.scenes.filter(s => s.id !== sceneId);
      const cleaned = remaining.map(s => ({
        ...s,
        choices: s.choices.map(choice => (
          choice.nextSceneId === sceneId ? { ...choice, nextSceneId: null } : choice
        )),
      }));
      return {
        ...prev,
        scenes: cleaned,
      };
    });
    const nextProject = store.get().project;
    selectedId = nextProject.scenes[0]?.id ?? null;
    validationResults = null;
    setStatus(`Deleted scene ${sceneId}.`);
  }

  function setSceneType(sceneId, type) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id === sceneId) {
          const draft = cloneScene(scene);
          draft.type = type;
          if (type === SceneType.END) {
            draft.choices = [];
          }
          return draft;
        }
        if (type === SceneType.START && scene.type === SceneType.START) {
          return { ...scene, type: SceneType.INTERMEDIATE };
        }
        return scene;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
    setStatus(`Scene ${sceneId} set to ${type}.`);
  }

  function setSceneImage(sceneId, file) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        const draft = cloneScene(scene);
        if (draft.image?.objectUrl) {
          URL.revokeObjectURL(draft.image.objectUrl);
        }
        if (!file) {
          draft.image = null;
        } else {
          draft.image = {
            name: file.name,
            objectUrl: URL.createObjectURL(file),
          };
        }
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
    setStatus(file ? `Updated image for ${sceneId}.` : `Removed image for ${sceneId}.`);
  }

  function addDialogue(sceneId) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        if (scene.dialogue.length >= 2) return scene;
        const draft = cloneScene(scene);
        draft.dialogue = [...draft.dialogue, { text: '', audio: null }];
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
  }

  function removeDialogue(sceneId, index) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        if (scene.dialogue.length <= 1) return scene;
        const draft = cloneScene(scene);
        const [removed] = draft.dialogue.splice(index, 1);
        if (removed?.audio?.objectUrl) {
          URL.revokeObjectURL(removed.audio.objectUrl);
        }
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
  }

  function updateDialogueText(sceneId, index, text) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        const draft = cloneScene(scene);
        if (!draft.dialogue[index]) return draft;
        draft.dialogue[index].text = text;
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
  }

  function setDialogueAudio(sceneId, index, file) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        const draft = cloneScene(scene);
        if (!draft.dialogue[index]) return draft;
        if (draft.dialogue[index].audio?.objectUrl) {
          URL.revokeObjectURL(draft.dialogue[index].audio.objectUrl);
        }
        if (!file) {
          draft.dialogue[index].audio = null;
        } else {
          draft.dialogue[index].audio = {
            name: file.name,
            objectUrl: URL.createObjectURL(file),
          };
        }
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
  }

  function addChoice(sceneId, choice) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        if (scene.choices.length >= 3) return scene;
        const draft = cloneScene(scene);
        draft.choices = [...draft.choices, choice];
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
  }

  function removeChoice(sceneId, index) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        const draft = cloneScene(scene);
        draft.choices = draft.choices.filter((_, idx) => idx !== index);
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
  }

  function updateChoice(sceneId, index, updates) {
    mutateProject(prev => {
      const scenes = prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        const draft = cloneScene(scene);
        if (!draft.choices[index]) return draft;
        draft.choices[index] = { ...draft.choices[index], ...updates };
        return draft;
      });
      return { ...prev, scenes };
    });
    validationResults = null;
  }

  function runValidation() {
    const result = validateProject(store.get().project);
    validationResults = result;
    setStatus(result.errors.length ? 'Validation failed.' : 'Validation passed.');
    return result;
  }

  syncSelection();
  update();
  return cleanup;
}
