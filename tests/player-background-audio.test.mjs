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

const initialPlayCount = FakeAudio.playCalls.length;

const clonedProject = cloneProject(store.get().project);
store.set({ project: clonedProject });

logResult(
  'Background track persists across re-render',
  FakeAudio.playCalls.length === initialPlayCount && FakeAudio.instances[0] === backgroundInstance && backgroundInstance?.paused === false,
);

const choiceButton = findByText(uiHost, 'To End');
logResult('Choice button renders', Boolean(choiceButton));
if (choiceButton) {
  choiceButton.dispatchEvent('click');
}

logResult('Background track stops when leaving scene', FakeAudio.pauseCalls.includes('bg-loop.ogg'));
logResult('Background track paused state after stop', backgroundInstance?.paused === true);

cleanup();
