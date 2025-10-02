import { renderGraph } from './graph.js';
import { renderInspector } from './inspector.js';

export function renderEditor(store, leftEl, rightEl, setStatus) {
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  const graphHost = document.createElement('div');
  graphHost.className = 'placeholder';
  graphHost.textContent = 'Graph canvas (MVP placeholder) — add scenes, connect choices → next scenes.';
  leftEl.appendChild(graphHost);

  const inspectorHost = document.createElement('div');
  inspectorHost.className = 'placeholder';
  inspectorHost.innerHTML = [
    '<h3>Inspector</h3>',
    '<p>Select a scene to edit its image, up to 2 dialogue lines (with optional MP3), and up to 3 choices.</p>',
    '<button id="add-scene">Add Scene</button>',
  ].join('');
  rightEl.appendChild(inspectorHost);

  const btnAdd = inspectorHost.querySelector('#add-scene');
  btnAdd.addEventListener('click', () => {
    // Simple demo: append a stub scene
    const project = store.get().project;
    const id = 'scene-' + String(project.scenes.length + 1).padStart(3, '0');
    project.scenes.push({ id, type: 'intermediate', image: null, dialogue: [], choices: [], notes: '' });
    store.set({ project });
    setStatus('Added ' + id);
  });
}
