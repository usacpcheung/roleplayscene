export function ensureAudioGate(store) {
  if (!store.get().audioGate) store.set({ audioGate: true });
}

export function createBackgroundAudioController() {
  let activeAudio = null;
  let activeSrc = null;

  function stop() {
    if (!activeAudio) {
      activeSrc = null;
      return;
    }
    try {
      if (typeof activeAudio.pause === 'function') {
        activeAudio.pause();
      }
    } catch (err) {
      console.warn('Failed to pause background audio', err);
    }
    try {
      activeAudio.currentTime = 0;
    } catch (err) {
      // ignore inability to reset currentTime
    }
    activeAudio = null;
    activeSrc = null;
  }

  function play(src) {
    if (!src) {
      stop();
      return;
    }
    if (activeSrc === src && activeAudio) {
      if (activeAudio.paused && typeof activeAudio.play === 'function') {
        try {
          const attempt = activeAudio.play();
          if (attempt?.catch) {
            attempt.catch(() => {});
          }
        } catch (err) {
          console.warn('Background audio resume failed', err);
        }
      }
      return;
    }

    stop();

    const audio = new Audio(src);
    audio.loop = true;

    activeAudio = audio;
    activeSrc = src;

    try {
      const playAttempt = audio.play();
      if (playAttempt?.catch) {
        playAttempt.catch((err) => {
          console.warn('Background audio playback failed', err);
          if (activeAudio === audio) {
            stop();
          }
        });
      }
    } catch (err) {
      console.warn('Background audio playback failed', err);
      if (activeAudio === audio) {
        stop();
      }
    }
  }

  return {
    play,
    stop,
    teardown: stop,
  };
}
