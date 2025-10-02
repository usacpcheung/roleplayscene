import { ensureAudioGate } from './audio.js';
import { renderPlayerUI } from './ui.js';

export function renderPlayer(store, leftEl, rightEl, setStatus) {
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  const gateBtn = document.createElement('button');
  gateBtn.textContent = 'Start Playback';
  gateBtn.addEventListener('click', () => {
    ensureAudioGate(store);
    setStatus('Audio unlocked.');
    renderPlayerUI(store, leftEl, rightEl);
  });

  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.innerHTML = '<h3>Play Mode</h3><p>Click the button to unlock audio and start from the Start scene.</p>';
  rightEl.appendChild(gateBtn);
  rightEl.appendChild(placeholder);

  // Simple stage area
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.textContent = 'Stage (scene image will display here)';
  leftEl.appendChild(stage);
}
