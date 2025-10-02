import assert from 'node:assert/strict';
import { Store } from '../public/scripts/state.js';
import { createProject, createScene, SceneType } from '../public/scripts/model.js';
import {
  serializeProject,
  hydrateProject,
  revokeProjectObjectUrls,
  setupPersistence,
} from '../public/scripts/storage.js';

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

const revokedUrls = [];
let urlCounter = 0;

URL.createObjectURL = (blob) => {
  assert.ok(blob instanceof Blob, 'serialize/hydrate should pass Blob instances to URL.createObjectURL');
  const url = `blob:test-${urlCounter += 1}`;
  return url;
};

URL.revokeObjectURL = (url) => {
  revokedUrls.push(url);
};

const imageBlob = new Blob(['image-data'], { type: 'text/plain' });
const audioBlob = new Blob(['audio-data'], { type: 'audio/mpeg' });

const sourceProject = createProject({
  meta: { title: 'Persistent Adventure', version: 3 },
  scenes: [createScene({
    id: 'scene-1',
    type: SceneType.START,
    image: { name: 'cover.png', objectUrl: 'blob:legacy-img', blob: imageBlob },
    backgroundAudio: { name: 'bg.mp3', objectUrl: 'blob:legacy-bg', blob: audioBlob },
    dialogue: [
      { text: 'Welcome!', audio: { name: 'line.mp3', objectUrl: 'blob:legacy-line', blob: audioBlob } },
    ],
    choices: [],
  })],
});

const serialised = serializeProject(sourceProject);
assert.ok(serialised);
assert.strictEqual(serialised.meta.title, 'Persistent Adventure');
assert.strictEqual(serialised.scenes[0].image.blob, imageBlob, 'image blob should survive serialisation');
assert.strictEqual(serialised.scenes[0].image.objectUrl, undefined, 'objectUrl should be stripped from serialised data');

const hydrated = hydrateProject(serialised, { previousProject: sourceProject });
assert.strictEqual(hydrated.meta.title, 'Persistent Adventure');
assert.strictEqual(hydrated.scenes[0].image.blob, imageBlob, 'image blob should survive hydration');
assert.ok(typeof hydrated.scenes[0].image.objectUrl === 'string', 'hydrated image should receive a fresh objectUrl');
assert.notStrictEqual(hydrated.scenes[0].image.objectUrl, 'blob:legacy-img', 'hydrated objectUrl should differ from legacy value');
assert.ok(revokedUrls.includes('blob:legacy-img'), 'previous image objectUrl should be revoked');
assert.ok(revokedUrls.includes('blob:legacy-bg'), 'previous bg audio objectUrl should be revoked');
assert.ok(revokedUrls.includes('blob:legacy-line'), 'previous dialogue audio objectUrl should be revoked');

revokeProjectObjectUrls(hydrated);
assert.ok(revokedUrls.includes(hydrated.scenes[0].image.objectUrl), 'revoking hydrated project should revoke new objectUrl');

URL.createObjectURL = originalCreateObjectURL;
URL.revokeObjectURL = originalRevokeObjectURL;

const store = new Store();
let persistenceMessage = '';
const cleanup = await setupPersistence(store, { showMessage: (msg) => { persistenceMessage = msg; } });
assert.strictEqual(typeof cleanup, 'function', 'setupPersistence should return a cleanup function');
cleanup();
assert.ok(persistenceMessage.includes('Autosave disabled'), 'fallback message should mention autosave being disabled');

console.log('storage persistence helpers tests passed');
