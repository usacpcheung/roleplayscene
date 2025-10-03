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
        { id: 'choice-quiet', label: 'To Quiet', nextSceneId: 'quiet-1' },
      ],
      autoNextSceneId: null,
      notes: '',
    },
    {
      id: 'quiet-1',
      type: SceneType.INTERMEDIATE,
      image: null,
      backgroundAudio: null,
      dialogue: [{ text: 'So quiet here', audio: null }],
      choices: [
        { id: 'choice-override', label: 'To Override', nextSceneId: 'override-1' },
      ],
      autoNextSceneId: null,
      notes: '',
    },
    {
      id: 'override-1',
      type: SceneType.INTERMEDIATE,
      image: null,
      backgroundAudio: { name: 'Dramatic', objectUrl: 'dramatic.ogg' },
      dialogue: [{ text: 'Things escalate', audio: null }],
      choices: [
        { id: 'choice-back', label: 'Back to Quiet', nextSceneId: 'quiet-2' },
      ],
      autoNextSceneId: null,
      notes: '',
    },
    {
      id: 'quiet-2',
      type: SceneType.INTERMEDIATE,
      image: null,
      backgroundAudio: null,
      dialogue: [{ text: 'Peace returns', audio: null }],
      choices: [
        { id: 'choice-end', label: 'To End', nextSceneId: 'end-1' },
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

const pauseCountBeforeQuiet = FakeAudio.pauseCalls.length;
const instanceCountBeforeQuiet = FakeAudio.instances.length;
const quietChoice = findByText(uiHost, 'To Quiet');
logResult('To Quiet choice renders', Boolean(quietChoice));
if (quietChoice) {
  quietChoice.dispatchEvent('click');
}

logResult('Background loop continues into silent scene', FakeAudio.pauseCalls.length === pauseCountBeforeQuiet);
logResult(
  'Silent scene reuses default background instance',
  FakeAudio.instances.length === instanceCountBeforeQuiet && FakeAudio.instances[FakeAudio.instances.length - 1] === resumedInstance,
);
logResult('Background loop still playing during silent scene', resumedInstance?.paused === false);

const playCountBeforeOverride = FakeAudio.playCalls.length;
const pauseCountBeforeOverride = FakeAudio.pauseCalls.length;
const overrideChoice = findByText(uiHost, 'To Override');
logResult('To Override choice renders', Boolean(overrideChoice));
if (overrideChoice) {
  overrideChoice.dispatchEvent('click');
}

const overrideInstance = FakeAudio.instances[FakeAudio.instances.length - 1] ?? null;
logResult(
  'Override pauses default loop',
  FakeAudio.pauseCalls.length === pauseCountBeforeOverride + 1
    && FakeAudio.pauseCalls[FakeAudio.pauseCalls.length - 1] === 'bg-loop.ogg',
);
logResult(
  'Override track starts playback',
  FakeAudio.playCalls.length === playCountBeforeOverride + 1
    && FakeAudio.playCalls[FakeAudio.playCalls.length - 1] === 'dramatic.ogg',
);
logResult('Override track active', overrideInstance?.src === 'dramatic.ogg' && overrideInstance?.paused === false);

const playCountBeforeReturn = FakeAudio.playCalls.length;
const pauseCountBeforeReturn = FakeAudio.pauseCalls.length;
const returnChoice = findByText(uiHost, 'Back to Quiet');
logResult('Back to Quiet choice renders', Boolean(returnChoice));
if (returnChoice) {
  returnChoice.dispatchEvent('click');
}

const fallbackResumeInstance = FakeAudio.instances[FakeAudio.instances.length - 1] ?? null;
logResult(
  'Override track stops when leaving override scene',
  FakeAudio.pauseCalls.length === pauseCountBeforeReturn + 1
    && FakeAudio.pauseCalls[FakeAudio.pauseCalls.length - 1] === 'dramatic.ogg',
);
logResult(
  'Fallback resumes after override scene',
  FakeAudio.playCalls.length === playCountBeforeReturn + 1
    && FakeAudio.playCalls[FakeAudio.playCalls.length - 1] === 'bg-loop.ogg',
);
logResult('Fallback playing after override', fallbackResumeInstance?.src === 'bg-loop.ogg' && fallbackResumeInstance?.paused === false);

const pauseCountBeforeEnd = FakeAudio.pauseCalls.length;
const instanceCountBeforeEnd = FakeAudio.instances.length;
const endChoice = findByText(uiHost, 'To End');
logResult('To End choice renders', Boolean(endChoice));
if (endChoice) {
  endChoice.dispatchEvent('click');
}

logResult('Fallback persists on End scene', FakeAudio.pauseCalls.length === pauseCountBeforeEnd);
logResult(
  'End scene keeps current background instance',
  FakeAudio.instances.length === instanceCountBeforeEnd
    && FakeAudio.instances[FakeAudio.instances.length - 1]?.src === 'bg-loop.ogg',
);

const pauseCountBeforeCleanup = FakeAudio.pauseCalls.length;
cleanup();
logResult(
  'Cleanup stops background audio',
  FakeAudio.pauseCalls.length === pauseCountBeforeCleanup + 1
    && FakeAudio.pauseCalls[FakeAudio.pauseCalls.length - 1] === 'bg-loop.ogg',
);
