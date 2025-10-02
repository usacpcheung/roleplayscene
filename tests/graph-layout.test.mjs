import assert from 'node:assert/strict';
import { computeSceneGraphLayout } from '../public/scripts/editor/graph.js';
import { SceneType } from '../public/scripts/model.js';

const sampleProject = {
  scenes: [
    { id: 'start', type: SceneType.START, choices: [
      { id: 'choice-1', label: 'Go left', nextSceneId: 'left' },
      { id: 'choice-2', label: 'Go right', nextSceneId: 'right' },
    ] },
    { id: 'left', type: SceneType.INTERMEDIATE, choices: [
      { id: 'choice-3', label: 'Finish', nextSceneId: 'end-a' },
    ] },
    { id: 'right', type: SceneType.INTERMEDIATE, choices: [
      { id: 'choice-4', label: 'Finish', nextSceneId: 'end-b' },
    ] },
    { id: 'end-a', type: SceneType.END, choices: [] },
    { id: 'end-b', type: SceneType.END, choices: [] },
    { id: 'orphan', type: SceneType.INTERMEDIATE, choices: [] },
  ],
};

const layout = computeSceneGraphLayout(sampleProject);

assert.strictEqual(layout.rowCount, 4, 'expected four rows including orphan row and ending row');
assert.strictEqual(layout.columnCount, 2, 'expected two columns for branching level');

const startPos = layout.positions.get('start');
assert.deepStrictEqual(startPos, { row: 0, column: 0 }, 'start scene should anchor row 0 column 0');

const leftPos = layout.positions.get('left');
const rightPos = layout.positions.get('right');
assert.strictEqual(leftPos.row, 1, 'left branch should be depth row 1');
assert.strictEqual(rightPos.row, 1, 'right branch should be depth row 1');
assert.notStrictEqual(leftPos.column, rightPos.column, 'siblings should occupy different columns');

const endARow = layout.positions.get('end-a').row;
const endBRow = layout.positions.get('end-b').row;
assert.strictEqual(endARow, layout.rowCount - 1, 'end scenes should occupy final row');
assert.strictEqual(endBRow, layout.rowCount - 1, 'end scenes should occupy final row');

const orphanRow = layout.positions.get('orphan').row;
assert.strictEqual(orphanRow, layout.rowCount - 2, 'unreachable nodes should appear before final ending row');

console.log('graph layout helper tests passed');
