export function ensureAudioGate(store) {
  if (!store.get().audioGate) store.set({ audioGate: true });
}
