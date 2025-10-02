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
  let backgroundVolume = 0.4;
  let backgroundMuted = false;
  const backgroundTrack = createBackgroundAudioController({ defaultVolume: backgroundVolume });
  backgroundTrack.setVolume(backgroundVolume);

  const unsubscribe = store.subscribe(() => {
    if (!currentSceneId) return;
    const { project } = store.get();
    if (!project.scenes.some(scene => scene.id === currentSceneId)) {
      const start = findStartScene(project);
      currentSceneId = start?.id ?? null;
    }
    if (currentSceneId) {
      renderCurrentScene();
    }
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
      backgroundTrack.stop();
      currentSceneId = startScene.id;
      renderCurrentScene();
    });
    uiPanel.append(title, startBtn);
  }

  function renderCurrentScene() {
    const { project } = store.get();
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
        currentSceneId = nextId;
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

  renderIntro();
  return cleanup;
}
