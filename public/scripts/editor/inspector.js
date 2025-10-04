import { SceneType, createChoice } from '../model.js';
import { translate } from '../i18n.js';

export function renderInspector(hostEl, project, scene, actions) {
  hostEl.innerHTML = '';
  hostEl.classList.add('inspector');

  const projectTitleField = document.createElement('label');
  projectTitleField.className = 'field';
  const projectTitleLabel = document.createElement('span');
  projectTitleLabel.textContent = translate('inspector.projectTitleLabel');
  projectTitleField.appendChild(projectTitleLabel);
  const projectTitleInput = document.createElement('input');
  projectTitleInput.type = 'text';
  projectTitleInput.value = project.meta?.title ?? '';
  projectTitleInput.placeholder = translate('inspector.projectTitlePlaceholder');
  projectTitleInput.maxLength = 120;
  projectTitleInput.dataset.focusKey = 'project-title';
  projectTitleInput.addEventListener('input', () => {
    actions.onUpdateProjectTitle?.(projectTitleInput.value);
  });
  projectTitleField.appendChild(projectTitleInput);
  hostEl.appendChild(projectTitleField);

  if (!scene) {
    const empty = document.createElement('p');
    empty.textContent = translate('inspector.emptyState');
    hostEl.appendChild(empty);
    return;
  }

  const header = document.createElement('div');
  header.className = 'inspector-header';
  header.innerHTML = `<h3>${scene.id}</h3>`;

  const controls = document.createElement('div');
  controls.className = 'inspector-actions';

  const addBtn = document.createElement('button');
  addBtn.textContent = translate('inspector.header.addScene');
  addBtn.addEventListener('click', () => actions.onAddScene?.());
  addBtn.disabled = project.scenes.length >= 20;

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = translate('inspector.header.deleteScene');
  deleteBtn.addEventListener('click', () => actions.onDeleteScene?.(scene.id));
  deleteBtn.disabled = !actions.canDeleteScene;

  controls.append(addBtn, deleteBtn);
  header.appendChild(controls);
  hostEl.appendChild(header);

  // Scene type selector
  const typeField = document.createElement('label');
  typeField.className = 'field';
  const typeLabel = document.createElement('span');
  typeLabel.textContent = translate('inspector.sceneTypeLabel');
  typeField.appendChild(typeLabel);
  const typeSelect = document.createElement('select');
  typeSelect.dataset.focusKey = `scene-type-${scene.id}`;
  const sceneTypeOptions = [
    { value: SceneType.START, label: translate('inspector.sceneTypes.start') },
    { value: SceneType.INTERMEDIATE, label: translate('inspector.sceneTypes.intermediate') },
    { value: SceneType.END, label: translate('inspector.sceneTypes.end') },
  ];
  sceneTypeOptions.forEach(optionDef => {
    const option = document.createElement('option');
    option.value = optionDef.value;
    option.textContent = optionDef.label;
    typeSelect.appendChild(option);
  });
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
  imageLabel.textContent = translate('inspector.image.label');
  imageField.appendChild(imageLabel);

  const imagePreview = document.createElement('div');
  imagePreview.className = 'image-preview';
  if (scene.image?.objectUrl) {
    const img = document.createElement('img');
    img.src = scene.image.objectUrl;
    img.alt = translate('inspector.image.previewAlt', { sceneId: scene.id });
    imagePreview.appendChild(img);
  } else {
    imagePreview.textContent = translate('inspector.image.empty');
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
    removeImageBtn.textContent = translate('inspector.image.remove');
    removeImageBtn.addEventListener('click', () => actions.onSetSceneImage?.(scene.id, null));
    imageField.appendChild(removeImageBtn);
  }

  hostEl.appendChild(imageField);

  const backgroundField = document.createElement('div');
  backgroundField.className = 'field';
  const backgroundLabel = document.createElement('span');
  backgroundLabel.textContent = translate('inspector.background.label');
  backgroundField.appendChild(backgroundLabel);

  if (scene.backgroundAudio) {
    const info = document.createElement('div');
    info.className = 'audio-info';
    const trackName = scene.backgroundAudio.name || translate('inspector.background.fallbackName');
    info.textContent = translate('inspector.background.attached', { name: trackName });
    backgroundField.appendChild(info);
  } else {
    const emptyInfo = document.createElement('p');
    emptyInfo.className = 'hint';
    emptyInfo.textContent = translate('inspector.background.empty');
    backgroundField.appendChild(emptyInfo);
  }

  const backgroundInput = document.createElement('input');
  backgroundInput.type = 'file';
  backgroundInput.accept = 'audio/*';
  backgroundInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    actions.onSetSceneBackgroundAudio?.(scene.id, file || null);
  });
  backgroundField.appendChild(backgroundInput);

  if (scene.backgroundAudio) {
    const removeBgButton = document.createElement('button');
    removeBgButton.type = 'button';
    removeBgButton.textContent = translate('inspector.background.remove');
    removeBgButton.addEventListener('click', () => actions.onSetSceneBackgroundAudio?.(scene.id, null));
    backgroundField.appendChild(removeBgButton);
  }

  hostEl.appendChild(backgroundField);

  // Dialogue
  const dialogueSection = document.createElement('section');
  dialogueSection.className = 'dialogue-editor';
  const dialogueHeader = document.createElement('h4');
  dialogueHeader.textContent = translate('inspector.dialogue.title');
  dialogueSection.appendChild(dialogueHeader);

  scene.dialogue.forEach((line, index) => {
    const lineField = document.createElement('div');
    lineField.className = 'dialogue-line';

    const textLabel = document.createElement('label');
    const textSpan = document.createElement('span');
    textSpan.textContent = translate('inspector.dialogue.lineLabel', { index: index + 1 });
    textLabel.appendChild(textSpan);
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
    const audioSpan = document.createElement('span');
    audioSpan.textContent = translate('inspector.dialogue.audioLabel');
    audioLabel.appendChild(audioSpan);
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
      const audioName = line.audio.name || '';
      audioInfo.textContent = translate('inspector.dialogue.audioAttached', { name: audioName });
      const removeAudio = document.createElement('button');
      removeAudio.type = 'button';
      removeAudio.textContent = translate('inspector.dialogue.removeAudio');
      removeAudio.addEventListener('click', () => actions.onSetDialogueAudio?.(scene.id, index, null));
      audioInfo.appendChild(removeAudio);
      lineField.appendChild(audioInfo);
    }

    const removeLineBtn = document.createElement('button');
    removeLineBtn.type = 'button';
    removeLineBtn.textContent = translate('inspector.dialogue.deleteLine');
    removeLineBtn.addEventListener('click', () => actions.onRemoveDialogue?.(scene.id, index));
    removeLineBtn.disabled = scene.dialogue.length <= 1;
    lineField.appendChild(removeLineBtn);

    dialogueSection.appendChild(lineField);
  });

  const addLineBtn = document.createElement('button');
  addLineBtn.type = 'button';
  addLineBtn.textContent = translate('inspector.dialogue.addLine');
  addLineBtn.addEventListener('click', () => actions.onAddDialogue?.(scene.id));
  addLineBtn.disabled = scene.dialogue.length >= 2;
  dialogueSection.appendChild(addLineBtn);
  hostEl.appendChild(dialogueSection);

  // Choices
  const choiceSection = document.createElement('section');
  choiceSection.className = 'choice-editor';
  const choiceHeader = document.createElement('h4');
  choiceHeader.textContent = translate('inspector.choices.title');
  choiceSection.appendChild(choiceHeader);

  if (!scene.choices.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty';
    emptyMessage.textContent = translate('inspector.choices.empty');
    choiceSection.appendChild(emptyMessage);
  }

  scene.choices.forEach((choice, index) => {
    const choiceRow = document.createElement('div');
    choiceRow.className = 'choice-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = translate('inspector.choices.labelPlaceholder');
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
    noneOption.textContent = translate('inspector.choices.destinationPlaceholder');
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
    removeBtn.textContent = translate('inspector.choices.remove');
    removeBtn.addEventListener('click', () => actions.onRemoveChoice?.(scene.id, index));
    choiceRow.appendChild(removeBtn);

    choiceSection.appendChild(choiceRow);
  });

  const addChoiceBtn = document.createElement('button');
  addChoiceBtn.type = 'button';
  addChoiceBtn.textContent = translate('inspector.choices.add');
  addChoiceBtn.addEventListener('click', () => actions.onAddChoice?.(scene.id, createChoice()));
  addChoiceBtn.disabled = scene.choices.length >= 3 || scene.type === SceneType.END;
  choiceSection.appendChild(addChoiceBtn);

  if (scene.type !== SceneType.END) {
    const autoNextField = document.createElement('label');
    autoNextField.className = 'field';
    const autoNextLabel = document.createElement('span');
    autoNextLabel.textContent = translate('inspector.choices.autoAdvanceLabel');
    autoNextField.appendChild(autoNextLabel);

    const autoNextSelect = document.createElement('select');
    autoNextSelect.dataset.focusKey = `auto-next-${scene.id}`;

    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = translate('inspector.choices.autoAdvanceNone');
    autoNextSelect.appendChild(noneOption);

    project.scenes.forEach(target => {
      if (target.id === scene.id) return;
      const option = document.createElement('option');
      option.value = target.id;
      option.textContent = target.id;
      autoNextSelect.appendChild(option);
    });

    const hasChoices = scene.choices.length > 0;
    const validSelection = scene.autoNextSceneId && project.scenes.some(target => target.id === scene.autoNextSceneId)
      ? scene.autoNextSceneId
      : '';
    autoNextSelect.value = validSelection || '';
    if (hasChoices) {
      autoNextSelect.value = '';
      autoNextSelect.disabled = true;
    }

    autoNextSelect.addEventListener('change', () => {
      const value = autoNextSelect.value || null;
      actions.onSetAutoNext?.(scene.id, value);
    });

    autoNextField.appendChild(autoNextSelect);

    if (hasChoices) {
      const helper = document.createElement('p');
      helper.className = 'hint';
      helper.textContent = translate('inspector.choices.autoAdvanceHelper');
      autoNextField.appendChild(helper);
    }

    choiceSection.appendChild(autoNextField);
  }
  hostEl.appendChild(choiceSection);

}

export function renderValidation(result, host, options = {}) {
  const { showEmptyState = true } = options;
  host.innerHTML = '';
  if (!result) return;
  const { errors = [], warnings = [] } = result;
  if (!errors.length && !warnings.length) {
    if (showEmptyState) {
      const ok = document.createElement('p');
      ok.className = 'validation-ok';
      ok.textContent = translate('inspector.validationOk');
      host.appendChild(ok);
    }
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
