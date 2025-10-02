// Schema helpers and factories
export const SceneType = Object.freeze({
  START: 'start',
  INTERMEDIATE: 'intermediate',
  END: 'end',
});

export function createScene(id, type = SceneType.INTERMEDIATE) {
  return {
    id,
    type,
    image: null,          // { name, blobId, width, height }
    dialogue: [],         // up to 2 items: { text, audio? { name, blobId, duration } }
    choices: [],          // up to 3 items: { id, label, nextSceneId }
    notes: ''
  };
}
