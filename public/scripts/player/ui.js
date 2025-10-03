import { SceneType } from '../model.js';

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

  const activePlaybackCleanups = new Set();
  let activeSequence = null;

  const stopAndResetAudio = (audio) => {
    if (typeof audio.pause === 'function') {
      audio.pause();
    }
    try {
      audio.currentTime = 0;
    } catch (err) {
      // Ignore reset failures (e.g., when audio is not seekable yet).
    }
  };

  const trackPlayback = (cleanup) => {
    let active = true;
    const stop = () => {
      if (!active) {
        return;
      }
      active = false;
      cleanup();
      activePlaybackCleanups.delete(stop);
    };
    activePlaybackCleanups.add(stop);
    return stop;
  };

  const stopAllPlayback = () => {
    if (activeSequence) {
      const sequence = activeSequence;
      activeSequence = null;
      sequence.stop();
    }
    const cleanups = Array.from(activePlaybackCleanups);
    cleanups.forEach(cleanup => {
      cleanup();
    });
  };

  if (!scene) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No scene selected.';
    uiEl.appendChild(placeholder);
    return stopAllPlayback;
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
      let sequenceActive = true;
      let activeCleanup = null;

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

        let stopPlayback = null;

        const finishLine = () => {
          if (stopPlayback) {
            stopPlayback();
            stopPlayback = null;
          }
          activeCleanup = null;
        };

        const onEnded = () => {
          finishLine();
          currentIndex += 1;
          playNext();
        };

        const onError = event => {
          const error = event?.error ?? event;
          finishLine();
          handleFailure(error);
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        stopPlayback = trackPlayback(() => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          stopAndResetAudio(audio);
        });

        activeCleanup = finishLine;

        try {
          const playAttempt = audio.play();
          if (playAttempt?.catch) {
            playAttempt.catch(err => {
              const failure = err?.error ?? err;
              finishLine();
              handleFailure(failure);
            });
          }
        } catch (err) {
          const failure = err?.error ?? err;
          finishLine();
          handleFailure(failure);
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
      playButton.addEventListener('click', () => {
        const audio = new Audio(line.audio.objectUrl);
        let stopPlayback = null;

        const finishPlayback = () => {
          if (stopPlayback) {
            stopPlayback();
            stopPlayback = null;
          }
        };

        const reportFailure = (error) => {
          const err = error?.error ?? error;
          console.warn('Audio playback failed', err);
          finishPlayback();
        };

        const onEnded = () => {
          finishPlayback();
        };

        const onError = (event) => {
          reportFailure(event);
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        stopPlayback = trackPlayback(() => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          stopAndResetAudio(audio);
        });

        try {
          const playAttempt = audio.play();
          if (playAttempt?.catch) {
            playAttempt.catch(err => {
              reportFailure(err);
            });
          }
        } catch (err) {
          reportFailure(err);
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

  return stopAllPlayback;
}
