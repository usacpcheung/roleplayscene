export function ensureAudioGate(store) {
  if (!store.get().audioGate) store.set({ audioGate: true });
}

export function createBackgroundAudioController({ defaultVolume = 0.4 } = {}) {
  let activeAudio = null;
  let activeSrc = null;
  let desiredSrc = null;
  let volume = Number.isFinite(defaultVolume) ? Math.max(0, Math.min(1, defaultVolume)) : 0.4;
  let muted = false;

  function applyAudioSettings(audio) {
    if (!audio) return;
    try {
      audio.volume = muted ? 0 : volume;
    } catch (err) {
      console.warn('Failed to apply background audio volume', err);
    }
  }

  function stop({ preserveDesired = false } = {}) {
    if (!preserveDesired) {
      desiredSrc = null;
    }
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
    desiredSrc = src ?? null;
    if (!src) {
      stop();
      return;
    }
    if (muted) {
      stop({ preserveDesired: true });
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

    stop({ preserveDesired: true });

    const audio = new Audio(src);
    audio.loop = true;
    applyAudioSettings(audio);

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

  function setVolume(nextVolume) {
    if (!Number.isFinite(nextVolume)) {
      return;
    }
    volume = Math.max(0, Math.min(1, nextVolume));
    if (!muted) {
      applyAudioSettings(activeAudio);
    }
  }

  function setMuted(nextMuted) {
    const desiredMuted = Boolean(nextMuted);
    if (desiredMuted === muted) {
      return;
    }
    muted = desiredMuted;
    if (muted) {
      stop({ preserveDesired: true });
      return;
    }
    if (desiredSrc) {
      play(desiredSrc);
    }
  }

  function getCurrentSource() {
    return activeSrc;
  }

  return {
    play,
    stop,
    teardown: stop,
    setVolume,
    setMuted,
    getCurrentSource,
  };
}
