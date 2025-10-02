export function renderPlayerUI(store, leftEl, rightEl) {
  const project = store.get().project;
  const start = project.scenes.find(s => s.type === 'start') || project.scenes[0];
  rightEl.innerHTML = '';

  const dlg = document.createElement('div');
  dlg.className = 'dialogue';
  dlg.innerHTML = `<strong>Scene:</strong> ${start ? start.id : 'N/A'}<br><em>Dialogue will appear here…</em>`;

  const choices = document.createElement('div');
  choices.className = 'choice-list';
  const btn = document.createElement('button');
  btn.textContent = 'Continue';
  btn.addEventListener('click', () => {
    alert('Transition to next scene (stub).');
  });
  choices.appendChild(btn);

  rightEl.appendChild(dlg);
  rightEl.appendChild(choices);
}
