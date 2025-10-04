const translations = {
  en: {
    toolbar: {
      appName: 'RolePlayScene',
      edit: 'Edit',
      play: 'Play',
      import: 'Import',
      export: 'Export',
      importTitle: 'Import project (.json or .zip)',
      exportTitle: 'Export project archive (.zip)',
      languageLabel: 'Language',
      localeNames: {
        en: 'English',
      },
      dismissMessage: 'Dismiss message',
    },
    messages: {
      validationBeforePlay: 'Resolve validation errors before entering Play mode.',
      importingProject: 'Importing project…',
      importedProject: 'Imported project.',
      importFailed: 'Import failed.',
      preparingExport: 'Preparing export…',
      exportedProject: 'Exported project archive.',
      exportFailed: 'Export failed.',
    },
    inspector: {
      projectTitleLabel: 'Project title',
      projectTitlePlaceholder: 'Untitled Role Play',
      emptyState: 'No scenes yet. Use “Add Scene” to begin.',
      header: {
        addScene: 'Add Scene',
        deleteScene: 'Delete Scene',
      },
      sceneTypeLabel: 'Scene type',
      sceneTypes: {
        start: 'Start',
        intermediate: 'Intermediate',
        end: 'End',
      },
      image: {
        label: 'Stage image',
        previewAlt: '{sceneId} preview',
        empty: 'No image selected.',
        remove: 'Remove image',
      },
      background: {
        label: 'Background music',
        attached: 'Attached: {name}',
        fallbackName: 'Untitled track',
        empty: 'No background track selected.',
        remove: 'Remove background music',
      },
      dialogue: {
        title: 'Dialogue (max 2 lines)',
        lineLabel: 'Line {index}',
        audioLabel: 'Audio (optional mp3)',
        audioAttached: 'Attached: {name}',
        removeAudio: 'Remove audio',
        deleteLine: 'Delete line',
        addLine: 'Add line',
      },
      choices: {
        title: 'Choices (max 3)',
        empty: 'No choices yet.',
        labelPlaceholder: 'Choice label',
        destinationPlaceholder: 'Select destination',
        remove: 'Remove',
        add: 'Add choice',
        autoAdvanceLabel: 'Auto-advance destination',
        autoAdvanceNone: 'No auto-advance',
        autoAdvanceHelper: 'Remove choices to enable auto-advance.',
      },
      validationOk: 'No validation issues found.',
      notifications: {
        sceneLimit: 'Scene limit reached (20).',
        sceneAdded: 'Added scene {id}.',
        sceneDeleted: 'Deleted scene {id}.',
        cannotDeleteStart: 'Cannot delete the only Start scene.',
        sceneTypeUpdated: 'Scene {id} set to {type}.',
        imageUpdated: 'Updated image for {id}.',
        imageRemoved: 'Removed image for {id}.',
        backgroundUpdated: 'Updated background audio for {id}.',
        backgroundRemoved: 'Removed background audio for {id}.',
      },
    },
    player: {
      ready: 'Ready to play',
      untitled: 'Role Play',
      begin: 'Begin Story',
      noStartScene: 'No Start scene found.',
      sceneMissing: 'Scene missing.',
      stageImageAlt: '{sceneId} artwork',
      stageImageEmpty: 'No stage image',
      noSceneSelected: 'No scene selected.',
      background: {
        title: 'Background music',
        volumeLabel: 'Background music volume',
        mute: 'Mute background music',
        unmute: 'Unmute background music',
      },
      history: {
        title: 'Story history',
        back: '← Back',
        forward: 'Forward →',
        backLabel: 'Go to previous scene',
        forwardLabel: 'Go to next scene',
        listLabel: 'Visited scenes',
      },
      dialogue: {
        playAll: '▶️ Play all',
        stopAll: '⏹ Stop playback',
        playAllAria: 'Play all dialogue audio',
        playLine: '▶️ Play line',
        stopLine: '⏹ Stop line',
        lineFallback: '(Line {index})',
        playbackError: 'Audio playback failed',
      },
      choices: {
        endMessage: 'The End',
        continue: 'Continue',
        autoNextMissing: 'Destination scene is missing.',
        noneAvailable: 'No choices available.',
      },
    },
    persistence: {
      autosaveUnavailable: 'Autosave disabled: IndexedDB not supported.',
      autosaveOpenFailed: 'Autosave disabled: unable to open browser storage.',
      autosaveReadFailed: 'Autosave disabled: unable to read saved project.',
      autosaveWriteFailed: 'Autosave disabled: storage error.',
    },
  },
};

let activeLocale = 'en';
const listeners = new Set();

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolvePath(dictionary, pathSegments) {
  return pathSegments.reduce((current, segment) => {
    if (!isPlainObject(current) && typeof current !== 'string') {
      return undefined;
    }
    if (isPlainObject(current)) {
      return current[segment];
    }
    return undefined;
  }, dictionary);
}

function formatValue(template, vars) {
  if (typeof template !== 'string') {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const value = vars[key];
      return value == null ? '' : String(value);
    }
    return match;
  });
}

export function getAvailableLocales() {
  return Object.keys(translations);
}

export function getActiveLocale() {
  return activeLocale;
}

export function setActiveLocale(locale) {
  const requested = typeof locale === 'string' && locale.trim() ? locale.trim() : 'en';
  const next = translations[requested] ? requested : 'en';
  if (next === activeLocale) {
    return activeLocale;
  }
  activeLocale = next;
  for (const handler of listeners) {
    try {
      handler(activeLocale);
    } catch (err) {
      console.error('Locale listener failed', err);
    }
  }
  return activeLocale;
}

export function ensureLocale(locale) {
  if (typeof locale !== 'string' || !locale.trim()) {
    return 'en';
  }
  const trimmed = locale.trim();
  return translations[trimmed] ? trimmed : 'en';
}

export function onLocaleChange(handler) {
  if (typeof handler !== 'function') {
    return () => {};
  }
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function translate(id, vars = {}) {
  if (!id) {
    return '';
  }
  const segments = String(id).split('.');
  const localesToCheck = [activeLocale, 'en'];
  for (const locale of localesToCheck) {
    const dictionary = translations[locale];
    if (!dictionary) continue;
    const value = resolvePath(dictionary, segments);
    if (value == null) continue;
    if (typeof value === 'function') {
      return value(vars, { locale: activeLocale });
    }
    return formatValue(value, vars);
  }
  return formatValue(vars.default ?? id, vars);
}

export function addTranslations(locale, entries) {
  if (typeof locale !== 'string' || !locale.trim()) {
    throw new Error('Locale code must be a non-empty string');
  }
  const code = locale.trim();
  if (!isPlainObject(entries)) {
    throw new Error('Translation entries must be an object');
  }
  const target = translations[code] ?? {};
  translations[code] = mergeDictionaries(target, entries);
}

function mergeDictionaries(target, source) {
  const output = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value)) {
      output[key] = mergeDictionaries(
        isPlainObject(output[key]) ? output[key] : {},
        value,
      );
    } else {
      output[key] = value;
    }
  }
  return output;
}

export { translations };
