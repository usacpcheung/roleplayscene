import { Store } from './state.js';
import { renderEditor } from './editor/editor.js';
import { renderPlayer } from './player/player.js';
import { importProject, exportProject } from './storage.js';

const elLeft = document.getElementById('left-pane');
const elRight = document.getElementById('right-pane');
const status = document.getElementById('status');

const btnEdit = document.getElementById('mode-edit');
const btnPlay = document.getElementById('mode-play');
const btnImport = document.getElementById('import-btn');
const btnExport = document.getElementById('export-btn');
const fileInput = document.getElementById('file-input');

const store = new Store();

let mode = 'edit'; // 'edit' | 'play'
let teardown = null;

function setMode(next) {
  if (teardown) {
    teardown();
    teardown = null;
  }
  mode = next;
  btnEdit.classList.toggle('active', mode === 'edit');
  btnPlay.classList.toggle('active', mode === 'play');
  if (mode === 'edit') {
    teardown = renderEditor(store, elLeft, elRight, setStatus);
  } else {
    teardown = renderPlayer(store, elLeft, elRight, setStatus);
  }
}

function setStatus(msg) {
  status.textContent = msg;
}

btnEdit.addEventListener('click', () => setMode('edit'));
btnPlay.addEventListener('click', () => setMode('play'));

btnImport.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await importProject(store, file);
    setStatus('Imported project.');
    setMode('edit');
  } catch (err) {
    console.error(err);
    setStatus('Import failed.');
  } finally {
    fileInput.value = '';
  }
});

btnExport.addEventListener('click', async () => {
  try {
    await exportProject(store);
    setStatus('Exported project JSON.');
  } catch (err) {
    console.error(err);
    setStatus('Export failed.');
  }
});

// Initial render
setMode('edit');
