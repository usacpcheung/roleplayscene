import { ensureAudioGate, createBackgroundAudioController } from './audio.js';
import { renderPlayerUI } from './ui.js';
import { SceneType } from '../model.js';

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

  function cleanup() {
    unsubscribe();
    backgroundTrack.teardown();
  }

  function findStartScene(project) {
    return project.scenes.find(scene => scene.type === SceneType.START) ?? project.scenes[0] ?? null;
  }

  function renderIntro() {
    const { project } = store.get();
    backgroundTrack.stop();
    resetHistory();
    stage.innerHTML = '';
    const introStage = document.createElement('div');
    introStage.className = 'stage-empty';
    introStage.textContent = 'Ready to play';
    stage.appendChild(introStage);

    uiPanel.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = project.meta?.title || 'Role Play';
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Begin Story';
    startBtn.addEventListener('click', () => {
      ensureAudioGate(store);
      const startScene = findStartScene(store.get().project);
      if (!startScene) {
        showMessage('No Start scene found.');
        return;
      }
      beginRunAt(startScene.id);
    });
    uiPanel.append(title, startBtn);
  }

  function renderCurrentScene() {
    const { project } = store.get();
    syncHistoryWithProject(project);

    if (!currentSceneId) {
      renderIntro();
      return;
    }

    const scene = project.scenes.find(s => s.id === currentSceneId);
    if (!scene) {
      backgroundTrack.stop();
      showMessage('Scene missing.');
      renderIntro();
      return;
    }

    syncBackgroundAudio(scene);

    renderPlayerUI({
      stageEl: stage,
      uiEl: uiPanel,
      project,
      scene,
      onChoice: (nextId) => {
        backgroundTrack.stop();
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
  }

  function syncBackgroundAudio(scene) {
    if (!scene || !store.get().audioGate) {
      backgroundTrack.stop();
      return;
    }
    const source = scene.backgroundAudio?.objectUrl ?? null;
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
    backgroundTrack.stop();
    sceneHistory = [sceneId];
    historyIndex = 0;
    currentSceneId = sceneId;
    renderCurrentScene();
  }

  function resetHistory() {
    sceneHistory = [];
    historyIndex = -1;
    currentSceneId = null;
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
    historyIndex = index;
    currentSceneId = sceneHistory[index];
    backgroundTrack.stop();
    renderCurrentScene();
  }

  function navigateHistory(delta) {
    goToHistoryIndex(historyIndex + delta);
  }

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
        const label = firstLine ? firstLine : fallback;
        return { sceneId, label };
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
