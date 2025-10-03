class StubElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.eventListeners = {};
    this.attributes = {};
    this._innerHTML = '';
    this.textContent = '';
    this.className = '';
    this.type = '';
    this.disabled = false;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  addEventListener(type, handler) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this.eventListeners[type]) {
      return;
    }
    this.eventListeners[type] = this.eventListeners[type].filter(cb => cb !== handler);
  }

  dispatchEvent(type, event = {}) {
    for (const handler of this.eventListeners[type] || []) {
      handler(event);
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }
}

class StubDocument {
  createElement(tagName) {
    return new StubElement(tagName);
  }
}

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.paused = true;
    this._listeners = {};
    FakeAudio.instances.push(this);
  }

  play() {
    this.paused = false;
    FakeAudio.playCalls.push(this.src);
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    FakeAudio.pauseCalls.push(this.src);
  }

  addEventListener(type, handler) {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this._listeners[type]) {
      return;
    }
    this._listeners[type] = this._listeners[type].filter(cb => cb !== handler);
  }

  trigger(type, event = {}) {
    for (const handler of this._listeners[type] || []) {
      handler(event);
    }
  }
}

FakeAudio.instances = [];
FakeAudio.playCalls = [];
FakeAudio.pauseCalls = [];

function resetAudioSpies() {
  FakeAudio.instances.length = 0;
  FakeAudio.playCalls.length = 0;
  FakeAudio.pauseCalls.length = 0;
}

globalThis.document = new StubDocument();
globalThis.Audio = FakeAudio;

const { renderPlayerUI } = await import('../public/scripts/player/ui.js');
const { SceneType } = await import('../public/scripts/model.js');

function createStage() {
  return new StubElement('div');
}

function createUIRoot() {
  return new StubElement('div');
}

function findByClass(root, className) {
  const classes = (root.className || '').split(/\s+/).filter(Boolean);
  if (classes.includes(className)) {
    return root;
  }
  for (const child of root.children || []) {
    const match = findByClass(child, className);
    if (match) {
      return match;
    }
  }
  return null;
}

function logResult(label, condition) {
  const status = condition ? 'OK' : 'FAIL';
  console.log(`${status}: ${label}`);
}

function renderScene(scene) {
  const stageEl = createStage();
  const uiEl = createUIRoot();
  const project = { scenes: [scene] };
  renderPlayerUI({ stageEl, uiEl, project, scene, onChoice: () => {} });
  return { stageEl, uiEl };
}

// Test: button hidden when no audio dialogue
resetAudioSpies();
let scene = {
  id: 'scene-1',
  type: SceneType.INTERMEDIATE,
  dialogue: [{ text: 'Hello there' }],
  choices: [],
};

let { uiEl } = renderScene(scene);
let playAllButton = findByClass(uiEl, 'audio-play-all');
logResult('Play All button hidden when no audio', playAllButton === null);

// Test: sequential playback across multiple clips
resetAudioSpies();
scene = {
  id: 'scene-2',
  type: SceneType.INTERMEDIATE,
  dialogue: [
    { text: 'Line 1', audio: { objectUrl: 'audio-1.ogg' } },
    { text: 'Line 2', audio: { objectUrl: 'audio-2.ogg' } },
  ],
  choices: [],
};

({ uiEl } = renderScene(scene));
playAllButton = findByClass(uiEl, 'audio-play-all');
logResult('Play All button renders when audio present', !!playAllButton);

playAllButton.dispatchEvent('click');
logResult('First clip starts playback', FakeAudio.playCalls[0] === 'audio-1.ogg');

FakeAudio.instances[0].trigger('ended');
logResult('Second clip starts after first ends', FakeAudio.playCalls[1] === 'audio-2.ogg');

FakeAudio.instances[0].trigger('ended');
logResult('Button resets after final clip', playAllButton.textContent === '▶️ Play all');

// Test: repeat click stops and restart works
resetAudioSpies();
({ uiEl } = renderScene(scene));
playAllButton = findByClass(uiEl, 'audio-play-all');

playAllButton.dispatchEvent('click');
logResult('Playback starts on demand', FakeAudio.playCalls[0] === 'audio-1.ogg');

playAllButton.dispatchEvent('click');
logResult('Playback stops on second click', playAllButton.textContent === '▶️ Play all');

playAllButton.dispatchEvent('click');
logResult('Playback restarts after stop', FakeAudio.playCalls[1] === 'audio-1.ogg');
