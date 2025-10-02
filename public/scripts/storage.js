// Import/Export (JSON). IndexedDB stubbed for now.
export async function importProject(store, file) {
  const text = await file.text();
  const json = JSON.parse(text);
  // TODO: validate json structure
  store.set({ project: json });
}

export async function exportProject(store) {
  const data = store.get().project;
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.meta?.title || 'roleplay') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
