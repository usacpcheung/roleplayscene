import { validateProject } from '../public/scripts/editor/validators.js';
import { createProject, createScene, createChoice, SceneType } from '../public/scripts/model.js';

function logResult(label, condition) {
  const status = condition ? 'OK' : 'FAIL';
  console.log(`${status}: ${label}`);
}

const validProject = createProject();
const validResult = validateProject(validProject);
logResult('Play allowed when validation passes', validResult.errors.length === 0);

const multiStartProject = createProject({
  scenes: [
    createScene({ type: SceneType.START }),
    createScene({ type: SceneType.START }),
  ],
});
const multiStartResult = validateProject(multiStartProject);
logResult('Multiple start scenes block Play mode', multiStartResult.errors.length > 0);

const brokenLinkProject = createProject({
  scenes: [
    createScene({ type: SceneType.START }),
    createScene({ type: SceneType.INTERMEDIATE }),
  ],
});
brokenLinkProject.scenes[0].choices = [
  createChoice({ label: 'Broken', nextSceneId: 'missing-scene' }),
];
const brokenLinkResult = validateProject(brokenLinkProject);
logResult('Broken links block Play mode', brokenLinkResult.errors.some(msg => msg.includes('missing scene')));
