import { ensureAudioGate, createBackgroundAudioController } from './audio.js';
import { renderPlayerUI } from './ui.js';
import { SceneType } from '../model.js';
import { translate } from '../i18n.js';

export function renderPlayer(store, leftEl, rightEl, showMessage) {
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  const stage = document.createElement('div');
  stage.className = 'stage';
  leftEl.appendChild(stage);

  const uiPanel = document.createElement('div');
  uiPanel.className = 'player-panel';
  rightEl.appendChild(uiPanel);

  let currentSceneId = null;
  let sceneHistory = [];
  let historyIndex = -1;
  let backgroundVolume = 0.4;
  let backgroundMuted = false;
  let defaultBackgroundSource = null;
  let activeDialogueCleanup = null;
  const backgroundTrack = createBackgroundAudioController({ defaultVolume: backgroundVolume });
  backgroundTrack.setVolume(backgroundVolume);

  const unsubscribe = store.subscribe(() => {
    if (!currentSceneId) return;
    const { project } = store.get();
    syncHistoryWithProject(project);

    if (!sceneHistory.length) {
      return;
    }

    if (!currentSceneId) {
      const start = findStartScene(project);
      if (start) {
        beginRunAt(start.id);
      } else {
        renderIntro();
      }
      return;
    }

    renderCurrentScene();
  });

  function stopActiveDialogue() {
    if (activeDialogueCleanup) {
      const cleanupFn = activeDialogueCleanup;
      activeDialogueCleanup = null;
      cleanupFn();
    }
  }

  function cleanup() {
    stopActiveDialogue();
    unsubscribe();
    backgroundTrack.teardown();
  }

  function findStartScene(project) {
    return project.scenes.find(scene => scene.type === SceneType.START) ?? project.scenes[0] ?? null;
  }

  function findSceneById(project, sceneId) {
    if (!sceneId) {
      return null;
    }
    return project.scenes.find(scene => scene.id === sceneId) ?? null;
  }

  function getEffectiveBackgroundSource(scene) {
    if (!scene) {
      return null;
    }
    return scene.backgroundAudio?.objectUrl ?? defaultBackgroundSource ?? null;
  }

  function maybeStopBeforeScene(nextScene) {
    const currentSource = backgroundTrack.getCurrentSource();
    const nextSource = getEffectiveBackgroundSource(nextScene);
    if (currentSource && nextSource && currentSource === nextSource) {
      return;
    }
    backgroundTrack.stop();
  }

  function renderIntro() {
    stopActiveDialogue();
    const { project } = store.get();
    maybeStopBeforeScene(null);
    resetHistory();
    stage.innerHTML = '';
    const introStage = document.createElement('div');
    introStage.className = 'stage-empty';
    introStage.textContent = translate('player.ready');
    stage.appendChild(introStage);

    uiPanel.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = project.meta?.title || translate('player.untitled');
    const startBtn = document.createElement('button');
    startBtn.textContent = translate('player.begin');
    startBtn.addEventListener('click', () => {
      ensureAudioGate(store);
      const startScene = findStartScene(store.get().project);
      if (!startScene) {
        showMessage({ textId: 'player.noStartScene' });
        return;
      }
      beginRunAt(startScene.id);
    });
    uiPanel.append(title, startBtn);
  }

  function renderCurrentScene() {
    stopActiveDialogue();
    const { project } = store.get();
    syncHistoryWithProject(project);

    if (!currentSceneId) {
      renderIntro();
      return;
    }

    const scene = findSceneById(project, currentSceneId);
    if (!scene) {
      maybeStopBeforeScene(null);
      showMessage({ textId: 'player.sceneMissing' });
      renderIntro();
      return;
    }

    syncBackgroundAudio(scene);

    const dialogueCleanup = renderPlayerUI({
      stageEl: stage,
      uiEl: uiPanel,
      project,
      scene,
      onChoice: (nextId) => {
        stopActiveDialogue();
        const nextScene = findSceneById(project, nextId);
        maybeStopBeforeScene(nextScene);
        pushSceneToHistory(nextId);
        renderCurrentScene();
      },
      backgroundAudioControls: store.get().audioGate
        ? {
            volume: backgroundVolume,
            muted: backgroundMuted,
            onVolumeChange: (value) => {
              backgroundVolume = value;
              backgroundTrack.setVolume(value);
            },
            onToggleMute: () => {
              backgroundMuted = !backgroundMuted;
              backgroundTrack.setMuted(backgroundMuted);
              return backgroundMuted;
            },
          }
        : null,
      historyControls: createHistoryControls(project),
    });

    activeDialogueCleanup = typeof dialogueCleanup === 'function' ? dialogueCleanup : null;
  }

  function syncBackgroundAudio(scene) {
    if (!store.get().audioGate) {
      backgroundTrack.stop();
      return;
    }
    const source = getEffectiveBackgroundSource(scene);
    if (!source) {
      backgroundTrack.stop();
      return;
    }
    backgroundTrack.setVolume(backgroundVolume);
    backgroundTrack.setMuted(backgroundMuted);
    backgroundTrack.play(source);
  }

  function beginRunAt(sceneId) {
    if (!sceneId) return;
    const { project } = store.get();
    const startScene = findStartScene(project);
    defaultBackgroundSource = startScene?.backgroundAudio?.objectUrl ?? null;
    const nextScene = findSceneById(project, sceneId);
    maybeStopBeforeScene(nextScene);
    sceneHistory = [sceneId];
    historyIndex = 0;
    currentSceneId = sceneId;
    renderCurrentScene();
  }

  function resetHistory() {
    sceneHistory = [];
    historyIndex = -1;
    currentSceneId = null;
    defaultBackgroundSource = null;
  }

  function pushSceneToHistory(sceneId) {
    if (!sceneId) {
      return;
    }
    if (historyIndex < sceneHistory.length - 1) {
      sceneHistory = sceneHistory.slice(0, historyIndex + 1);
    }
    if (sceneHistory[sceneHistory.length - 1] !== sceneId) {
      sceneHistory.push(sceneId);
    }
    historyIndex = sceneHistory.length - 1;
    currentSceneId = sceneId;
  }

  function syncHistoryWithProject(project) {
    if (!sceneHistory.length) {
      return;
    }

    const availableIds = new Set(project.scenes.map(scene => scene.id));
    const filtered = sceneHistory.filter(id => availableIds.has(id));

    if (!filtered.length) {
      resetHistory();
      return;
    }

    if (filtered.length !== sceneHistory.length) {
      sceneHistory = filtered;
    }

    if (historyIndex >= sceneHistory.length) {
      historyIndex = sceneHistory.length - 1;
    }

    currentSceneId = sceneHistory[historyIndex] ?? null;
  }

  function goToHistoryIndex(index) {
    if (index < 0 || index >= sceneHistory.length) {
      return;
    }
    stopActiveDialogue();
    const { project } = store.get();
    const nextSceneId = sceneHistory[index];
    const nextScene = findSceneById(project, nextSceneId);
    maybeStopBeforeScene(nextScene);
    historyIndex = index;
    currentSceneId = nextSceneId;
    renderCurrentScene();
  }

  function navigateHistory(delta) {
    goToHistoryIndex(historyIndex + delta);
  }

  const HISTORY_LABEL_MAX_LENGTH = 30;

  const truncateHistoryLabel = (text) => {
    if (!text) {
      return text;
    }
    const glyphs = Array.from(text);
    if (glyphs.length <= HISTORY_LABEL_MAX_LENGTH) {
      return text;
    }
    const sliceLength = Math.max(1, HISTORY_LABEL_MAX_LENGTH - 1);
    return `${glyphs.slice(0, sliceLength).join('')}…`;
  };

  function createHistoryControls(project) {
    if (!sceneHistory.length) {
      return null;
    }

    const entries = sceneHistory
      .map((sceneId) => {
        const scene = project.scenes.find(s => s.id === sceneId);
        if (!scene) {
          return null;
        }
        const fallback = scene.id || sceneId;
        const firstLine = scene.dialogue?.[0]?.text?.trim();
        const fullLabel = firstLine || fallback;
        const label = truncateHistoryLabel(fullLabel);
        return { sceneId, label, fullLabel };
      })
      .filter(Boolean);

    if (!entries.length) {
      return null;
    }

    const clampedIndex = Math.max(0, Math.min(historyIndex, entries.length - 1));
    if (clampedIndex !== historyIndex) {
      historyIndex = clampedIndex;
      currentSceneId = sceneHistory[historyIndex];
    }

    return {
      entries,
      index: historyIndex,
      canGoBack: historyIndex > 0,
      canGoForward: historyIndex < entries.length - 1,
      onBack: () => navigateHistory(-1),
      onForward: () => navigateHistory(1),
      onJump: (index) => goToHistoryIndex(index),
    };
  }

  renderIntro();
  return cleanup;
}
