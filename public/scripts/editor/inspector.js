import { SceneType, createChoice } from '../model.js';

export function renderInspector(hostEl, project, scene, actions) {
  hostEl.innerHTML = '';
  hostEl.classList.add('inspector');

  if (!scene) {
    const empty = document.createElement('p');
    empty.textContent = 'No scenes yet. Use “Add Scene” to begin.';
    hostEl.appendChild(empty);
    return;
  }

  const validationBox = document.createElement('div');
  validationBox.className = 'validation-results';

  const header = document.createElement('div');
  header.className = 'inspector-header';
  header.innerHTML = `<h3>${scene.id}</h3>`;

  const controls = document.createElement('div');
  controls.className = 'inspector-actions';

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Scene';
  addBtn.addEventListener('click', () => actions.onAddScene?.());
  addBtn.disabled = project.scenes.length >= 20;

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete Scene';
  deleteBtn.addEventListener('click', () => actions.onDeleteScene?.(scene.id));
  deleteBtn.disabled = !actions.canDeleteScene;

  controls.append(addBtn, deleteBtn);
  header.appendChild(controls);
  hostEl.appendChild(header);

  // Scene type selector
  const typeField = document.createElement('label');
  typeField.className = 'field';
  typeField.innerHTML = '<span>Scene type</span>';
  const typeSelect = document.createElement('select');
  typeSelect.dataset.focusKey = `scene-type-${scene.id}`;
  typeSelect.innerHTML = `
    <option value="${SceneType.START}">Start</option>
    <option value="${SceneType.INTERMEDIATE}">Intermediate</option>
    <option value="${SceneType.END}">End</option>
  `;
  typeSelect.value = scene.type;
  typeSelect.addEventListener('change', () => {
    actions.onSetSceneType?.(scene.id, typeSelect.value);
  });
  typeField.appendChild(typeSelect);
  hostEl.appendChild(typeField);

  // Image upload
  const imageField = document.createElement('div');
  imageField.className = 'field';
  const imageLabel = document.createElement('span');
  imageLabel.textContent = 'Stage image';
  imageField.appendChild(imageLabel);

  const imagePreview = document.createElement('div');
  imagePreview.className = 'image-preview';
  if (scene.image?.objectUrl) {
    const img = document.createElement('img');
    img.src = scene.image.objectUrl;
    img.alt = `${scene.id} preview`;
    imagePreview.appendChild(img);
  } else {
    imagePreview.textContent = 'No image selected.';
  }
  imageField.appendChild(imagePreview);

  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    actions.onSetSceneImage?.(scene.id, file || null);
  });
  imageField.appendChild(imageInput);

  if (scene.image) {
    const removeImageBtn = document.createElement('button');
    removeImageBtn.type = 'button';
    removeImageBtn.textContent = 'Remove image';
    removeImageBtn.addEventListener('click', () => actions.onSetSceneImage?.(scene.id, null));
    imageField.appendChild(removeImageBtn);
  }

  hostEl.appendChild(imageField);

  // Dialogue
  const dialogueSection = document.createElement('section');
  dialogueSection.className = 'dialogue-editor';
  const dialogueHeader = document.createElement('h4');
  dialogueHeader.textContent = 'Dialogue (max 2 lines)';
  dialogueSection.appendChild(dialogueHeader);

  scene.dialogue.forEach((line, index) => {
    const lineField = document.createElement('div');
    lineField.className = 'dialogue-line';

    const textLabel = document.createElement('label');
    textLabel.innerHTML = `<span>Line ${index + 1}</span>`;
    const textarea = document.createElement('textarea');
    textarea.value = line.text || '';
    textarea.rows = 2;
    textarea.dataset.focusKey = `dialogue-${scene.id}-${index}`;
    textarea.addEventListener('input', () => {
      actions.onUpdateDialogueText?.(scene.id, index, textarea.value);
    });
    textLabel.appendChild(textarea);
    lineField.appendChild(textLabel);

    const audioLabel = document.createElement('label');
    audioLabel.innerHTML = '<span>Audio (optional mp3)</span>';
    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/mpeg,audio/mp3';
    audioInput.dataset.focusKey = `dialogue-audio-${scene.id}-${index}`;
    audioInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      actions.onSetDialogueAudio?.(scene.id, index, file || null);
    });
    audioLabel.appendChild(audioInput);
    lineField.appendChild(audioLabel);

    if (line.audio) {
      const audioInfo = document.createElement('div');
      audioInfo.className = 'audio-info';
      audioInfo.textContent = `Attached: ${line.audio.name}`;
      const removeAudio = document.createElement('button');
      removeAudio.type = 'button';
      removeAudio.textContent = 'Remove audio';
      removeAudio.addEventListener('click', () => actions.onSetDialogueAudio?.(scene.id, index, null));
      audioInfo.appendChild(removeAudio);
      lineField.appendChild(audioInfo);
    }

    const removeLineBtn = document.createElement('button');
    removeLineBtn.type = 'button';
    removeLineBtn.textContent = 'Delete line';
    removeLineBtn.addEventListener('click', () => actions.onRemoveDialogue?.(scene.id, index));
    removeLineBtn.disabled = scene.dialogue.length <= 1;
    lineField.appendChild(removeLineBtn);

    dialogueSection.appendChild(lineField);
  });

  const addLineBtn = document.createElement('button');
  addLineBtn.type = 'button';
  addLineBtn.textContent = 'Add line';
  addLineBtn.addEventListener('click', () => actions.onAddDialogue?.(scene.id));
  addLineBtn.disabled = scene.dialogue.length >= 2;
  dialogueSection.appendChild(addLineBtn);
  hostEl.appendChild(dialogueSection);

  // Choices
  const choiceSection = document.createElement('section');
  choiceSection.className = 'choice-editor';
  const choiceHeader = document.createElement('h4');
  choiceHeader.textContent = 'Choices (max 3)';
  choiceSection.appendChild(choiceHeader);

  if (!scene.choices.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty';
    emptyMessage.textContent = 'No choices yet.';
    choiceSection.appendChild(emptyMessage);
  }

  scene.choices.forEach((choice, index) => {
    const choiceRow = document.createElement('div');
    choiceRow.className = 'choice-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Choice label';
    labelInput.value = choice.label || '';
    labelInput.dataset.focusKey = `choice-label-${scene.id}-${index}`;
    labelInput.addEventListener('input', () => {
      actions.onUpdateChoice?.(scene.id, index, { label: labelInput.value });
    });
    choiceRow.appendChild(labelInput);

    const select = document.createElement('select');
    select.dataset.focusKey = `choice-target-${scene.id}-${index}`;
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'Select destination';
    select.appendChild(noneOption);
    project.scenes.forEach((target) => {
      const option = document.createElement('option');
      option.value = target.id;
      option.textContent = target.id;
      select.appendChild(option);
    });
    select.value = choice.nextSceneId || '';
    select.addEventListener('change', () => {
      const value = select.value || null;
      actions.onUpdateChoice?.(scene.id, index, { nextSceneId: value });
    });
    choiceRow.appendChild(select);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => actions.onRemoveChoice?.(scene.id, index));
    choiceRow.appendChild(removeBtn);

    choiceSection.appendChild(choiceRow);
  });

  const addChoiceBtn = document.createElement('button');
  addChoiceBtn.type = 'button';
  addChoiceBtn.textContent = 'Add choice';
  addChoiceBtn.addEventListener('click', () => actions.onAddChoice?.(scene.id, createChoice()));
  addChoiceBtn.disabled = scene.choices.length >= 3 || scene.type === SceneType.END;
  choiceSection.appendChild(addChoiceBtn);
  hostEl.appendChild(choiceSection);

  renderValidation(actions.validationResults, validationBox);
  hostEl.appendChild(validationBox);
}

function renderValidation(result, host) {
  host.innerHTML = '';
  if (!result) return;
  const { errors = [], warnings = [] } = result;
  if (!errors.length && !warnings.length) {
    const ok = document.createElement('p');
    ok.className = 'validation-ok';
    ok.textContent = 'No validation issues found.';
    host.appendChild(ok);
    return;
  }

  if (errors.length) {
    const list = document.createElement('ul');
    list.className = 'validation-errors';
    errors.forEach(err => {
      const li = document.createElement('li');
      li.textContent = err;
      list.appendChild(li);
    });
    host.appendChild(list);
  }

  if (warnings.length) {
    const list = document.createElement('ul');
    list.className = 'validation-warnings';
    warnings.forEach(msg => {
      const li = document.createElement('li');
      li.textContent = msg;
      list.appendChild(li);
    });
    host.appendChild(list);
  }
}
