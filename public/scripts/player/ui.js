import { SceneType } from '../model.js';

function createDialogueAudioController() {
  let audio = null;
  let activeMode = null;
  let endedHandler = null;
  let errorHandler = null;

  const ensureAudio = () => {
    if (!audio) {
      audio = new Audio();
    }
    return audio;
  };

  const detachListeners = () => {
    if (!audio) {
      return;
    }
    if (endedHandler) {
      audio.removeEventListener('ended', endedHandler);
      endedHandler = null;
    }
    if (errorHandler) {
      audio.removeEventListener('error', errorHandler);
      errorHandler = null;
    }
  };

  const resetElement = () => {
    if (!audio) {
      return;
    }
    detachListeners();
    try {
      audio.pause();
    } catch (err) {
      // Ignore pause failures.
    }
    try {
      audio.currentTime = 0;
    } catch (err) {
      // Ignore reset failures (e.g., when audio is not seekable yet).
    }
    // Clearing the src releases resources without destroying the element.
    if (audio.src) {
      if (typeof audio.removeAttribute === 'function') {
        audio.removeAttribute('src');
      } else {
        audio.src = '';
      }
      if (typeof audio.load === 'function') {
        audio.load();
      }
    }
  };

  const stop = ({ reason = 'cancel', error = null } = {}) => {
    if (!activeMode) {
      return;
    }

    const mode = activeMode;

    if (mode.type === 'sequence' && mode.currentEntry) {
      mode.handlers?.onLineEnd?.(mode.currentEntry, mode.currentIndex);
      mode.currentEntry = null;
    }

    activeMode = null;
    resetElement();

    if (reason === 'complete') {
      mode.handlers?.onComplete?.();
    } else if (reason === 'error') {
      mode.handlers?.onError?.(error);
    } else {
      mode.handlers?.onCancel?.();
    }
  };

  const playClip = ({ src, onComplete, onCancel, onError }) => {
    if (!src) {
      return;
    }

    stop();

    const handlers = {
      onComplete,
      onCancel,
      onError,
    };

    const mode = {
      type: 'clip',
      handlers,
    };

    activeMode = mode;

    const element = ensureAudio();

    endedHandler = () => {
      stop({ reason: 'complete' });
    };

    errorHandler = (event) => {
      const err = event?.error ?? event;
      stop({ reason: 'error', error: err });
    };

    element.addEventListener('ended', endedHandler);
    element.addEventListener('error', errorHandler);

    element.src = src;

    try {
      element.currentTime = 0;
    } catch (err) {
      // Ignore reset failures.
    }

    try {
      const playAttempt = element.play();
      if (playAttempt?.catch) {
        playAttempt.catch(err => {
          if (activeMode === mode) {
            stop({ reason: 'error', error: err });
          }
        });
      }
    } catch (err) {
      stop({ reason: 'error', error: err });
    }
  };

  const playSequence = (entries, handlers = {}) => {
    stop();

    if (!entries?.length) {
      handlers.onComplete?.();
      return;
    }

    const mode = {
      type: 'sequence',
      handlers,
      currentIndex: 0,
      currentEntry: null,
      entries,
    };

    activeMode = mode;

    const element = ensureAudio();

    const playCurrent = () => {
      if (activeMode !== mode) {
        return;
      }

      if (mode.currentIndex >= mode.entries.length) {
        stop({ reason: 'complete' });
        return;
      }

      const entry = mode.entries[mode.currentIndex];
      mode.currentEntry = entry;
      handlers.onLineStart?.(entry, mode.currentIndex);

      detachListeners();

      endedHandler = () => {
        handlers.onLineEnd?.(entry, mode.currentIndex);
        mode.currentEntry = null;
        mode.currentIndex += 1;
        playCurrent();
      };

      errorHandler = (event) => {
        const err = event?.error ?? event;
        handlers.onLineEnd?.(entry, mode.currentIndex);
        mode.currentEntry = null;
        stop({ reason: 'error', error: err });
      };

      element.addEventListener('ended', endedHandler);
      element.addEventListener('error', errorHandler);

      element.src = entry.src;

      try {
        element.currentTime = 0;
      } catch (err) {
        // Ignore reset failures.
      }

      try {
        const playAttempt = element.play();
        if (playAttempt?.catch) {
          playAttempt.catch(err => {
            if (activeMode === mode) {
              handlers.onLineEnd?.(entry, mode.currentIndex);
              mode.currentEntry = null;
              stop({ reason: 'error', error: err });
            }
          });
        }
      } catch (err) {
        handlers.onLineEnd?.(entry, mode.currentIndex);
        mode.currentEntry = null;
        stop({ reason: 'error', error: err });
      }
    };

    playCurrent();
  };

  return {
    playClip,
    playSequence,
    stop: () => stop(),
  };
}

export function renderPlayerUI({
  stageEl,
  uiEl,
  project,
  scene,
  onChoice,
  backgroundAudioControls = null,
  historyControls = null,
}) {
  stageEl.innerHTML = '';
  uiEl.innerHTML = '';

  const dialogueAudio = createDialogueAudioController();

  const lineButtons = new Map();
  let activeLineIndex = null;

  const setLineButtonState = (index, active) => {
    const button = lineButtons.get(index);
    if (!button) {
      return;
    }

    if (active) {
      if (activeLineIndex !== null && activeLineIndex !== index) {
        setLineButtonState(activeLineIndex, false);
      }
      activeLineIndex = index;
      button.textContent = '⏹ Stop line';
      button.setAttribute('aria-pressed', 'true');
    } else {
      if (activeLineIndex === index) {
        activeLineIndex = null;
      }
      button.textContent = '▶️ Play line';
      button.setAttribute('aria-pressed', 'false');
    }
  };

  const resetAllLines = () => {
    if (activeLineIndex !== null) {
      setLineButtonState(activeLineIndex, false);
    }
  };

  if (!scene) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No scene selected.';
    uiEl.appendChild(placeholder);
    return () => dialogueAudio.stop();
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

  if (backgroundAudioControls) {
    const bgControls = document.createElement('div');
    bgControls.className = 'background-audio-controls';

    const heading = document.createElement('h4');
    heading.textContent = 'Background music';
    bgControls.appendChild(heading);

    const volumeWrapper = document.createElement('div');
    volumeWrapper.className = 'background-volume';

    const volumeLabel = document.createElement('label');
    volumeLabel.textContent = 'Background music volume';

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.05';
    volumeSlider.value = String(backgroundAudioControls.volume ?? 0);
    volumeSlider.setAttribute('aria-label', 'Background music volume');
    volumeSlider.disabled = Boolean(backgroundAudioControls.muted);

    const volumeValue = document.createElement('span');
    volumeValue.className = 'background-volume-value';
    const initialVolume = Number(backgroundAudioControls.volume ?? 0);
    volumeValue.textContent = `${Math.round(initialVolume * 100)}%`;

    volumeSlider.addEventListener('input', event => {
      const value = Number(event.target.value);
      backgroundAudioControls.volume = value;
      volumeValue.textContent = `${Math.round(value * 100)}%`;
      backgroundAudioControls.onVolumeChange?.(value);
    });

    volumeLabel.appendChild(volumeSlider);
    volumeWrapper.append(volumeLabel, volumeValue);
    bgControls.appendChild(volumeWrapper);

    const muteButton = document.createElement('button');
    muteButton.type = 'button';

    const updateMuteLabel = (muted) => {
      muteButton.textContent = muted ? 'Unmute background music' : 'Mute background music';
      muteButton.setAttribute('aria-pressed', muted ? 'true' : 'false');
      muteButton.setAttribute('aria-label', muted ? 'Unmute background music' : 'Mute background music');
      volumeSlider.disabled = muted;
    };

    updateMuteLabel(Boolean(backgroundAudioControls.muted));

    muteButton.addEventListener('click', () => {
      const nextMuted = backgroundAudioControls.onToggleMute?.();
      const resolved = typeof nextMuted === 'boolean' ? nextMuted : !backgroundAudioControls.muted;
      backgroundAudioControls.muted = resolved;
      updateMuteLabel(resolved);
    });

    bgControls.appendChild(muteButton);
    uiEl.appendChild(bgControls);
  }

  if (historyControls?.entries?.length) {
    const historyWrapper = document.createElement('div');
    historyWrapper.className = 'player-history';

    const historyTitle = document.createElement('h4');
    historyTitle.className = 'player-history-title';
    historyTitle.textContent = 'Story history';
    historyWrapper.appendChild(historyTitle);

    const navControls = document.createElement('div');
    navControls.className = 'player-history-nav';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'player-history-back';
    backButton.textContent = '← Back';
    backButton.disabled = !historyControls.canGoBack;
    backButton.setAttribute('aria-label', 'Go to previous scene');
    if (historyControls.onBack) {
      backButton.addEventListener('click', () => historyControls.onBack());
    }

    const forwardButton = document.createElement('button');
    forwardButton.type = 'button';
    forwardButton.className = 'player-history-forward';
    forwardButton.textContent = 'Forward →';
    forwardButton.disabled = !historyControls.canGoForward;
    forwardButton.setAttribute('aria-label', 'Go to next scene');
    if (historyControls.onForward) {
      forwardButton.addEventListener('click', () => historyControls.onForward());
    }

    navControls.appendChild(backButton);
    navControls.appendChild(forwardButton);
    historyWrapper.appendChild(navControls);

    const historyList = document.createElement('ol');
    historyList.className = 'player-history-list';
    historyList.setAttribute('aria-label', 'Visited scenes');

    historyControls.entries.forEach((entry, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'player-history-entry';
      button.textContent = entry.label || entry.sceneId;
      if (button.dataset) {
        button.dataset.sceneId = entry.sceneId;
      }

      if (index === historyControls.index) {
        button.disabled = true;
        button.setAttribute('aria-current', 'step');
      } else if (historyControls.onJump) {
        button.addEventListener('click', () => historyControls.onJump(index));
      }

      item.appendChild(button);
      historyList.appendChild(item);
    });

    historyWrapper.appendChild(historyList);
    uiEl.appendChild(historyWrapper);
  }

  const dialogueBox = document.createElement('div');
  dialogueBox.className = 'player-dialogue';

  const audioEntries = scene.dialogue
    .map((line, index) => ({ line, index }))
    .filter(entry => entry.line.audio?.objectUrl);

  let playAllActive = false;

  const setPlayAllState = (active) => {
    playAllActive = active;
    if (!playAllButton) {
      return;
    }
    playAllButton.textContent = active ? '⏹ Stop playback' : '▶️ Play all';
    playAllButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    playAllButton.disabled = false;
  };

  let playAllButton = null;

  if (audioEntries.length) {
    playAllButton = document.createElement('button');
    playAllButton.type = 'button';
    playAllButton.className = 'audio-play-all';
    playAllButton.textContent = '▶️ Play all';
    playAllButton.setAttribute('aria-label', 'Play all dialogue audio');
    playAllButton.setAttribute('aria-pressed', 'false');

    const revertPlayAll = () => {
      setPlayAllState(false);
      resetAllLines();
    };

    playAllButton.addEventListener('click', () => {
      const wasActive = playAllActive;
      dialogueAudio.stop();
      if (wasActive) {
        return;
      }

      setPlayAllState(true);

      dialogueAudio.playSequence(
        audioEntries.map(entry => ({
          src: entry.line.audio.objectUrl,
          index: entry.index,
        })),
        {
          onLineStart: (entry) => {
            setLineButtonState(entry.index, true);
          },
          onLineEnd: (entry) => {
            setLineButtonState(entry.index, false);
          },
          onComplete: () => {
            revertPlayAll();
          },
          onCancel: () => {
            revertPlayAll();
          },
          onError: (error) => {
            console.warn('Audio playback failed', error);
            revertPlayAll();
          },
        },
      );
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
      playButton.setAttribute('aria-pressed', 'false');

      lineButtons.set(index, playButton);

      playButton.addEventListener('click', () => {
        const wasActive = activeLineIndex === index;
        dialogueAudio.stop();
        if (wasActive) {
          return;
        }

        setLineButtonState(index, true);

        dialogueAudio.playClip({
          src: line.audio.objectUrl,
          onComplete: () => {
            setLineButtonState(index, false);
          },
          onCancel: () => {
            setLineButtonState(index, false);
          },
          onError: (error) => {
            console.warn('Audio playback failed', error);
            setLineButtonState(index, false);
          },
        });
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

  return () => {
    dialogueAudio.stop();
  };
}
