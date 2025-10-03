import assert from 'node:assert/strict';
import { Store } from '../public/scripts/state.js';
import { createProject, createScene, SceneType } from '../public/scripts/model.js';
import {
  serializeProject,
  hydrateProject,
  revokeProjectObjectUrls,
  setupPersistence,
  createProjectArchive,
  importProject,
} from '../public/scripts/storage.js';
import { unzip } from '../public/scripts/utils/zip.js';

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

const exportStore = new Store();
exportStore.set({ project: hydrated });
const { archiveData, payload } = await createProjectArchive(exportStore.get().project);
assert.ok(archiveData instanceof Uint8Array, 'archive should return Uint8Array data');
assert.strictEqual(payload.manifestVersion, 1, 'manifest version should be recorded');

const archiveEntries = await unzip(archiveData);
assert.ok(archiveEntries['project.json'], 'archive must contain project.json');
const mediaPaths = Object.keys(archiveEntries).filter(key => key !== 'project.json');
assert.strictEqual(mediaPaths.length, 3, 'image + background audio + dialogue audio should be exported');
const manifestJson = JSON.parse(new TextDecoder().decode(archiveEntries['project.json']));
assert.strictEqual(manifestJson.project.scenes[0].image.path, mediaPaths.find(path => path.includes('image')), 'manifest must reference image path');

const archiveBlob = new Blob([archiveData], { type: 'application/zip' });
const archiveFile = new File([archiveBlob], 'persistent-adventure.zip', { type: 'application/zip' });
const importStore = new Store();
await importProject(importStore, archiveFile);
const importedProject = importStore.get().project;
assert.strictEqual(importedProject.meta.title, 'Persistent Adventure', 'imported project should hydrate meta data');
assert.ok(importedProject.scenes[0].image.blob instanceof Blob, 'image blob should be recreated');
assert.ok(importedProject.scenes[0].backgroundAudio.blob instanceof Blob, 'background audio blob should be recreated');
assert.ok(importedProject.scenes[0].dialogue[0].audio.blob instanceof Blob, 'dialogue audio blob should be recreated');
assert.ok(typeof importedProject.scenes[0].image.objectUrl === 'string', 'image object URL should be restored');
assert.strictEqual(await importedProject.scenes[0].image.blob.text(), 'image-data', 'image blob data should round-trip');
assert.strictEqual(await importedProject.scenes[0].dialogue[0].audio.blob.text(), 'audio-data', 'dialogue audio data should round-trip');

const legacySnapshot = {
  meta: { title: 'Legacy Project', version: 1 },
  scenes: [{
    id: 'scene-legacy',
    type: SceneType.START,
    image: { name: 'legacy.png' },
    backgroundAudio: null,
    dialogue: [{ text: 'Hi there', audio: { name: 'legacy.mp3' } }],
    choices: [],
    autoNextSceneId: null,
    notes: '',
  }],
  assets: [],
};
const legacyFile = new File([JSON.stringify(legacySnapshot, null, 2)], 'legacy.json', { type: 'application/json' });
const legacyStore = new Store();
await importProject(legacyStore, legacyFile);
const legacyProject = legacyStore.get().project;
assert.strictEqual(legacyProject.meta.title, 'Legacy Project', 'legacy import should hydrate meta');
assert.ok(!legacyProject.scenes[0].image.blob, 'legacy import should leave missing media blobs null');
assert.ok(!legacyProject.scenes[0].dialogue[0].audio.blob, 'legacy dialogue audio should be null without binary');

console.log('storage persistence helpers tests passed');
