import { ensureAudioGate } from './audio.js';
import { renderPlayerUI } from './ui.js';
import { SceneType } from '../model.js';

export function renderPlayer(store, leftEl, rightEl, setStatus) {
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  const stage = document.createElement('div');
  stage.className = 'stage';
  leftEl.appendChild(stage);

  const uiPanel = document.createElement('div');
  uiPanel.className = 'player-panel';
  rightEl.appendChild(uiPanel);

  let currentSceneId = null;

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
  }

  function findStartScene(project) {
    return project.scenes.find(scene => scene.type === SceneType.START) ?? project.scenes[0] ?? null;
  }

  function renderIntro() {
    const { project } = store.get();
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
        setStatus('No Start scene found.');
        return;
      }
      currentSceneId = startScene.id;
      renderCurrentScene();
    });
    uiPanel.append(title, startBtn);
  }

  function renderCurrentScene() {
    const { project } = store.get();
    const scene = project.scenes.find(s => s.id === currentSceneId);
    if (!scene) {
      setStatus('Scene missing.');
      renderIntro();
      return;
    }
    renderPlayerUI({
      stageEl: stage,
      uiEl: uiPanel,
      project,
      scene,
      onChoice: (nextId) => {
        currentSceneId = nextId;
        renderCurrentScene();
      },
    });
  }

  renderIntro();
  return cleanup;
}
