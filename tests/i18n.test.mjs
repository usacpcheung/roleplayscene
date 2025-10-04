import assert from 'assert';

const {
  translate,
  setActiveLocale,
  addTranslations,
  ensureLocale,
  getActiveLocale,
  onLocaleChange,
  translations,
} = await import('../public/scripts/i18n.js');

function resetLocale() {
  setActiveLocale('en');
}

try {
  resetLocale();

  addTranslations('fr', {
    toolbar: {
      edit: 'Modifier',
    },
  });

  setActiveLocale('fr');
  assert.strictEqual(translate('toolbar.edit'), 'Modifier', 'Locale-specific translation should be used when available');
  assert.strictEqual(
    translate('messages.exportFailed'),
    'Export failed.',
    'Missing keys should fall back to English translations',
  );

  assert.strictEqual(ensureLocale('fr'), 'fr', 'Known locales should be preserved');
  assert.strictEqual(ensureLocale('zz'), 'en', 'Unknown locales should resolve to English');

  const observed = [];
  const unsubscribe = onLocaleChange((locale) => observed.push(locale));

  setActiveLocale('en');
  setActiveLocale('fr');

  unsubscribe();
  const lastLocale = observed[observed.length - 1];
  assert.strictEqual(lastLocale, 'fr', 'Locale change listeners should receive updates');
  assert.strictEqual(getActiveLocale(), 'fr', 'Active locale should reflect the latest change');
} finally {
  resetLocale();
  delete translations.fr;
}

console.log('i18n tests passed');
