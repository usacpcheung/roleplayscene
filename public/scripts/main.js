import { Store } from './state.js';
import { renderEditor } from './editor/editor.js';
import { renderPlayer } from './player/player.js';
import { importProject, exportProject, setupPersistence } from './storage.js';
import { validateProject } from './editor/validators.js';

const elLeft = document.getElementById('left-pane');
const elRight = document.getElementById('right-pane');
const messageHost = document.getElementById('app-messages');
const messageText = messageHost?.querySelector('.app-messages__text');
const dismissButton = messageHost?.querySelector('.app-messages__dismiss');

const btnEdit = document.getElementById('mode-edit');
const btnPlay = document.getElementById('mode-play');
const btnImport = document.getElementById('import-btn');
const btnExport = document.getElementById('export-btn');
const fileInput = document.getElementById('file-input');

const store = new Store();

let mode = 'edit'; // 'edit' | 'play'
let teardown = null;
let persistenceCleanup = () => {};

function setMode(next) {
  if (teardown) {
    teardown();
    teardown = null;
  }
  mode = next;
  btnEdit.classList.toggle('active', mode === 'edit');
  btnPlay.classList.toggle('active', mode === 'play');
  if (mode === 'edit') {
    teardown = renderEditor(store, elLeft, elRight, showMessage);
  } else {
    teardown = renderPlayer(store, elLeft, elRight, showMessage);
  }
}

function showMessage(msg) {
  if (!messageHost || !messageText) return;
  if (!msg) {
    clearMessage();
    return;
  }
  messageText.textContent = msg;
  messageHost.hidden = false;
}

function clearMessage() {
  if (!messageHost || !messageText) return;
  messageText.textContent = '';
  messageHost.hidden = true;
}

if (dismissButton) {
  dismissButton.addEventListener('click', () => {
    clearMessage();
  });
}

btnEdit.addEventListener('click', () => setMode('edit'));
btnPlay.addEventListener('click', () => {
  const result = validateProject(store.get().project);
  if (result.errors.length) {
    showMessage('Resolve validation errors before entering Play mode.');
    if (mode !== 'edit') {
      setMode('edit');
    }
    requestAnimationFrame(() => {
      const panel = elRight.querySelector('.validation-results');
      if (panel instanceof HTMLElement) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!panel.hasAttribute('tabindex')) {
          panel.setAttribute('tabindex', '-1');
        }
        if (typeof panel.focus === 'function') {
          panel.focus({ preventScroll: true });
        }
      }
    });
    return;
  }
  setMode('play');
  clearMessage();
});

btnImport.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await importProject(store, file);
    showMessage('Imported project.');
    setMode('edit');
  } catch (err) {
    console.error(err);
    showMessage('Import failed.');
  } finally {
    fileInput.value = '';
  }
});

btnExport.addEventListener('click', async () => {
  try {
    await exportProject(store);
    showMessage('Exported project JSON.');
  } catch (err) {
    console.error(err);
    showMessage('Export failed.');
  }
});

async function bootstrap() {
  try {
    persistenceCleanup = await setupPersistence(store, { showMessage });
  } catch (err) {
    console.error('Failed to initialise persistence', err);
    persistenceCleanup = () => {};
  }
  setMode('edit');
}

bootstrap();

window.addEventListener('beforeunload', () => {
  if (typeof teardown === 'function') {
    teardown();
  }
  if (typeof persistenceCleanup === 'function') {
    persistenceCleanup();
  }
});
