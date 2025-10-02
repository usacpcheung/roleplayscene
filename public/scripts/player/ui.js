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

  const audioEntries = scene.dialogue
    .map((line, index) => ({ line, index }))
    .filter(entry => entry.line.audio?.objectUrl);

  let activeSequence = null;

  if (audioEntries.length) {
    const playAllButton = document.createElement('button');
    playAllButton.type = 'button';
    playAllButton.className = 'audio-play-all';
    playAllButton.textContent = '▶️ Play all';
    playAllButton.setAttribute('aria-label', 'Play all dialogue audio');

    const resetButtonState = () => {
      playAllButton.textContent = '▶️ Play all';
      playAllButton.disabled = false;
    };

    const startSequence = () => {
      let cancelled = false;
      let currentIndex = 0;
      let activeCleanup = null;
      let sequenceActive = true;

      const handleFailure = err => {
        console.warn('Audio playback failed', err);
        finishSequence();
      };

      const finishSequence = () => {
        if (activeCleanup) {
          activeCleanup();
          activeCleanup = null;
        }
        sequenceActive = false;
        resetButtonState();
        activeSequence = null;
      };

      const playNext = () => {
        if (cancelled) {
          finishSequence();
          return;
        }

        const entry = audioEntries[currentIndex];
        if (!entry) {
          finishSequence();
          return;
        }

        if (activeCleanup) {
          activeCleanup();
          activeCleanup = null;
        }

        const audio = new Audio(entry.line.audio.objectUrl);

        const cleanup = () => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          if (typeof audio.pause === 'function') {
            audio.pause();
          }
          audio.currentTime = 0;
          activeCleanup = null;
        };

        const onEnded = () => {
          cleanup();
          currentIndex += 1;
          playNext();
        };

        const onError = event => {
          cleanup();
          handleFailure(event?.error ?? event);
        };

        activeCleanup = cleanup;

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        try {
          const playAttempt = audio.play();
          if (playAttempt?.catch) {
            playAttempt.catch(err => {
              cleanup();
              handleFailure(err);
            });
          }
        } catch (err) {
          cleanup();
          handleFailure(err);
        }
      };

      const sequence = {
        stop() {
          if (cancelled) {
            return;
          }
          cancelled = true;
          finishSequence();
        },
      };

      playAllButton.textContent = '⏹ Stop playback';
      playAllButton.disabled = false;

      playNext();

      return sequenceActive ? sequence : null;
    };

    playAllButton.addEventListener('click', () => {
      if (activeSequence) {
        activeSequence.stop();
        return;
      }

      activeSequence = startSequence();
    });

    dialogueBox.appendChild(playAllButton);
  }

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
    const sceneChoices = scene.choices || [];
    const autoNextId = scene.autoNextSceneId ?? null;
    const autoNextValid = Boolean(autoNextId)
      && project.scenes.some(s => s.id === autoNextId);

    if (!sceneChoices.length) {
      if (autoNextId) {
        const continueButton = document.createElement('button');
        continueButton.type = 'button';
        continueButton.textContent = 'Continue';
        continueButton.disabled = !autoNextValid;
        if (!autoNextValid) {
          continueButton.title = 'Destination scene is missing.';
        }
        continueButton.addEventListener('click', () => {
          if (autoNextValid && autoNextId) {
            onChoice?.(autoNextId);
          }
        });
        choiceBox.appendChild(continueButton);
      } else {
        const noChoices = document.createElement('p');
        noChoices.className = 'empty';
        noChoices.textContent = 'No choices available.';
        choiceBox.appendChild(noChoices);
      }
    }

    sceneChoices.forEach(choice => {
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
