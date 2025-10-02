import { SceneType } from '../model.js';

export function renderPlayerUI({ stageEl, uiEl, project, scene, onChoice }) {
  stageEl.innerHTML = '';
  uiEl.innerHTML = '';

  if (!scene) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No scene selected.';
    uiEl.appendChild(placeholder);
    return;
  }

  if (scene.image?.objectUrl) {
    const img = document.createElement('img');
    img.src = scene.image.objectUrl;
    img.alt = `${scene.id} artwork`;
    stageEl.appendChild(img);
  } else {
    const emptyStage = document.createElement('div');
    emptyStage.className = 'stage-empty';
    emptyStage.textContent = 'No stage image';
    stageEl.appendChild(emptyStage);
  }

  const dialogueBox = document.createElement('div');
  dialogueBox.className = 'player-dialogue';

  scene.dialogue.forEach((line, index) => {
    const lineContainer = document.createElement('div');
    lineContainer.className = 'player-dialogue-line';

    const text = document.createElement('p');
    text.textContent = line.text || `(Line ${index + 1})`;
    lineContainer.appendChild(text);

    if (line.audio?.objectUrl) {
      const playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.className = 'audio-play';
      playButton.textContent = '▶️ Play line';
      playButton.addEventListener('click', async () => {
        try {
          const audio = new Audio(line.audio.objectUrl);
          await audio.play();
        } catch (err) {
          console.warn('Audio playback failed', err);
        }
      });
      lineContainer.appendChild(playButton);
    }

    dialogueBox.appendChild(lineContainer);
  });

  uiEl.appendChild(dialogueBox);

  const choiceBox = document.createElement('div');
  choiceBox.className = 'player-choices';

  if (scene.type === SceneType.END) {
    const endMessage = document.createElement('p');
    endMessage.className = 'the-end';
    endMessage.textContent = 'The End';
    choiceBox.appendChild(endMessage);
  } else {
    if (!scene.choices.length) {
      const noChoices = document.createElement('p');
      noChoices.className = 'empty';
      noChoices.textContent = 'No choices available.';
      choiceBox.appendChild(noChoices);
    }

    scene.choices.forEach(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.label || 'Continue';
      button.disabled = !choice.nextSceneId || !project.scenes.some(s => s.id === choice.nextSceneId);
      button.addEventListener('click', () => {
        if (choice.nextSceneId) {
          onChoice?.(choice.nextSceneId);
        }
      });
      choiceBox.appendChild(button);
    });
  }

  uiEl.appendChild(choiceBox);
}
