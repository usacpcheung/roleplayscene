class StubElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.eventListeners = {};
    this.attributes = {};
    this._innerHTML = '';
    this._textContent = '';
    this.className = '';
    this.dataset = {};
    this.disabled = false;
    this.value = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...nodes) {
    nodes.forEach(node => {
      if (node instanceof StubElement) {
        this.appendChild(node);
      }
    });
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    if (this.children.length) {
      return this.children.map(child => child.textContent || '').join('');
    }
    return this._textContent;
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
    const handlers = this.eventListeners[type] || [];
    handlers.forEach(handler => handler({ ...event, target: event.target ?? this }));
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

class StubDocument {
  constructor() {
    this.body = new StubElement('body');
  }

  createElement(tagName) {
    return new StubElement(tagName);
  }
}

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.loop = false;
    this.paused = true;
    this.currentTime = 0;
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
}

FakeAudio.instances = [];
FakeAudio.playCalls = [];
FakeAudio.pauseCalls = [];

function resetAudioSpies() {
  FakeAudio.instances.length = 0;
  FakeAudio.playCalls.length = 0;
  FakeAudio.pauseCalls.length = 0;
}

function logResult(label, condition) {
  const status = condition ? 'OK' : 'FAIL';
  console.log(`${status}: ${label}`);
}

function findByText(root, text) {
  if (!root) {
    return null;
  }
  const hasChildren = (root.children?.length || 0) > 0;
  if (root.textContent === text && (!hasChildren || root.tagName === 'button')) {
    return root;
  }
  for (const child of root.children || []) {
    const match = findByText(child, text);
    if (match) {
      return match;
    }
  }
  return null;
}

function findElement(root, predicate) {
  if (!root) {
    return null;
  }
  if (predicate(root)) {
    return root;
  }
  for (const child of root.children || []) {
    const match = findElement(child, predicate);
    if (match) {
      return match;
    }
  }
  return null;
}

function cloneProject(project) {
  return {
    meta: { ...project.meta },
    scenes: project.scenes.map(scene => ({
      ...scene,
      image: scene.image ? { ...scene.image } : null,
      backgroundAudio: scene.backgroundAudio ? { ...scene.backgroundAudio } : null,
      dialogue: scene.dialogue.map(line => ({ ...line })),
      choices: scene.choices.map(choice => ({ ...choice })),
    })),
  };
}

globalThis.document = new StubDocument();
globalThis.Audio = FakeAudio;

const { renderPlayer } = await import('../public/scripts/player/player.js');
const { Store } = await import('../public/scripts/state.js');
const { SceneType } = await import('../public/scripts/model.js');

resetAudioSpies();

const store = new Store();
const project = {
  meta: { title: 'Audio Test' },
  scenes: [
    {
      id: 'start-1',
      type: SceneType.START,
      image: null,
      backgroundAudio: { name: 'Loop', objectUrl: 'bg-loop.ogg' },
      dialogue: [{ text: 'Welcome', audio: null }],
      choices: [
        { id: 'choice-1', label: 'To End', nextSceneId: 'end-1' },
      ],
      autoNextSceneId: null,
      notes: '',
    },
    {
      id: 'end-1',
      type: SceneType.END,
      image: null,
      backgroundAudio: null,
      dialogue: [{ text: 'The end', audio: null }],
      choices: [],
      autoNextSceneId: null,
      notes: '',
    },
  ],
};

store.set({ project });

const stageHost = new StubElement('div');
const uiHost = new StubElement('div');

const cleanup = renderPlayer(store, stageHost, uiHost, () => {});

logResult('Background idle before Begin Story', FakeAudio.playCalls.length === 0);

const startButton = findByText(uiHost, 'Begin Story');
logResult('Begin Story button renders', Boolean(startButton));
if (startButton) {
  startButton.dispatchEvent('click');
}

const backgroundInstance = FakeAudio.instances[0] ?? null;
logResult('Background track plays after Begin Story', FakeAudio.playCalls[0] === 'bg-loop.ogg');
logResult('Background track loops enabled', backgroundInstance?.loop === true);
logResult('Background track playing', backgroundInstance?.paused === false);
logResult('Background track default volume applied', Math.abs((backgroundInstance?.volume ?? 0) - 0.4) < 0.001);

const volumeSliderInitial = findElement(uiHost, el => el.tagName === 'input' && el.type === 'range');
logResult('Background volume slider renders', Boolean(volumeSliderInitial));
logResult(
  'Background slider default value',
  Boolean(volumeSliderInitial) && Math.abs(Number(volumeSliderInitial.value) - 0.4) < 0.001,
);

if (volumeSliderInitial) {
  volumeSliderInitial.value = '0.7';
  volumeSliderInitial.dispatchEvent('input', { target: volumeSliderInitial });
}

logResult(
  'Background volume updates active audio',
  Math.abs((backgroundInstance?.volume ?? 0) - 0.7) < 0.001,
);

const initialPlayCount = FakeAudio.playCalls.length;

const clonedProject = cloneProject(store.get().project);
store.set({ project: clonedProject });

const volumeSliderAfterRerender = findElement(uiHost, el => el.tagName === 'input' && el.type === 'range');
logResult('Background slider persists across re-render', Boolean(volumeSliderAfterRerender));
logResult(
  'Background slider retains value after re-render',
  Boolean(volumeSliderAfterRerender) && Math.abs(Number(volumeSliderAfterRerender.value) - 0.7) < 0.001,
);
logResult(
  'Background track persists across re-render',
  FakeAudio.playCalls.length === initialPlayCount && FakeAudio.instances[0] === backgroundInstance && backgroundInstance?.paused === false,
);

let muteButton = findByText(uiHost, 'Mute background music');
logResult('Mute button renders', Boolean(muteButton));
if (muteButton) {
  muteButton.dispatchEvent('click');
}

logResult('Background track stops when muted', FakeAudio.pauseCalls.includes('bg-loop.ogg'));
logResult('Background track paused state after mute', backgroundInstance?.paused === true);

const sliderWhileMuted = findElement(uiHost, el => el.tagName === 'input' && el.type === 'range');
logResult('Volume slider disabled while muted', Boolean(sliderWhileMuted?.disabled));

const unmuteButton = findByText(uiHost, 'Unmute background music');
logResult('Unmute button renders after toggle', Boolean(unmuteButton));
if (unmuteButton) {
  unmuteButton.dispatchEvent('click');
}

const resumedInstance = FakeAudio.instances[FakeAudio.instances.length - 1] ?? null;
logResult('Background track restarts after unmute', FakeAudio.playCalls.length === initialPlayCount + 1);
logResult('Background track resumes playback', resumedInstance?.paused === false);
logResult(
  'Background track retains volume after unmute',
  Math.abs((resumedInstance?.volume ?? 0) - 0.7) < 0.001,
);

muteButton = findByText(uiHost, 'Mute background music');
logResult('Mute button label resets after unmute', Boolean(muteButton));

const sliderAfterUnmute = findElement(uiHost, el => el.tagName === 'input' && el.type === 'range');
logResult('Volume slider enabled after unmute', Boolean(sliderAfterUnmute) && !sliderAfterUnmute.disabled);

const choiceButton = findByText(uiHost, 'To End');
logResult('Choice button renders', Boolean(choiceButton));
if (choiceButton) {
  choiceButton.dispatchEvent('click');
}

logResult('Background track stops when leaving scene', FakeAudio.pauseCalls.filter(src => src === 'bg-loop.ogg').length >= 2);
logResult('Background track paused state after stop', resumedInstance?.paused === true);

cleanup();
