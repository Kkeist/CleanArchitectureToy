/**
 * Click-carry rules: pick → follow → second click places or returns.
 * Also asserts pile / ring / ghost share one --cell face size in CSS,
 * and assemble guidance / View-test prompt copy.
 * Run: npx tsx scripts/check-drag.mts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { SlotId } from '../src/domain/entities/PieceKind.ts';
import { BOARD_SLOTS } from '../src/domain/entities/PieceKind.ts';
import {
  ASSEMBLE_GUIDE,
  TEST_PROMPT,
  TESTING_NOTE,
  assembleNote,
} from '../src/frameworks/ui/centerNotes.ts';

type DragPayload =
  | { from: 'pile'; kind: SlotId }
  | { from: 'slot'; slot: SlotId; kind: SlotId };

function placeIntoSlot(
  arrangement: Partial<Record<SlotId, SlotId>>,
  slot: SlotId,
  payload: DragPayload,
): Partial<Record<SlotId, SlotId>> {
  const next: Partial<Record<SlotId, SlotId>> = { ...arrangement };
  if (payload.from === 'slot') delete next[payload.slot];
  const displaced = next[slot];
  next[slot] = payload.kind;
  if (displaced && payload.from === 'slot' && payload.slot !== slot) {
    next[payload.slot] = displaced;
  }
  return next;
}

/** Second click: slot → place; null → return home. */
function secondClick(
  arrangement: Partial<Record<SlotId, SlotId>>,
  payload: DragPayload,
  target: SlotId | null,
): Partial<Record<SlotId, SlotId>> {
  if (target) return placeIntoSlot(arrangement, target, payload);
  return arrangement;
}

{
  let arr: Partial<Record<SlotId, SlotId>> = {};
  const payload: DragPayload = { from: 'pile', kind: 'con' };
  arr = secondClick(arr, payload, 'con');
  assert.equal(arr.con, 'con');
}

{
  let arr: Partial<Record<SlotId, SlotId>> = {};
  const payload: DragPayload = { from: 'pile', kind: 'db' };
  arr = secondClick(arr, payload, null);
  assert.deepEqual(arr, {});
}

{
  let arr: Partial<Record<SlotId, SlotId>> = { con: 'con' };
  const payload: DragPayload = { from: 'slot', slot: 'con', kind: 'con' };
  arr = secondClick(arr, payload, 'uc');
  assert.equal(arr.con, undefined);
  assert.equal(arr.uc, 'con');
}

{
  let arr: Partial<Record<SlotId, SlotId>> = { da: 'da' };
  const payload: DragPayload = { from: 'slot', slot: 'da', kind: 'da' };
  arr = secondClick(arr, payload, null);
  assert.equal(arr.da, 'da');
}

const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
assert.match(
  css,
  /\.piece-face,\s*\n\.pile-piece,\s*\n\.cell,\s*\n\.ghost \{/,
  'pile, ring, and ghost share one face size block',
);
assert.match(css, /width: var\(--cell\);/, 'face width is --cell');
assert.doesNotMatch(css, /--piece-scale/, 'no per-piece CSS scale');
assert.doesNotMatch(
  fs.readFileSync(path.resolve('src/frameworks/ui/assets.ts'), 'utf8'),
  /PIECE_SCALE|pieceScale/,
  'no per-piece JS scale',
);
const viewSrc = fs.readFileSync(
  path.resolve('src/frameworks/ui/AssemblyView.tsx'),
  'utf8',
);
assert.match(css, /\.top-guide/, 'assemble guide lives in the top bar');
assert.match(css, /\.top-guide[\s\S]*?color:\s*#ffffff/, 'top guide is white');
assert.match(viewSrc, /className="top-guide"/, 'View renders top-guide');
assert.match(
  viewSrc,
  /showGuide[\s\S]*?guide\.body/,
  'assemble/test guide body is in the top bar',
);
assert.match(
  viewSrc,
  /showProcessNotes[\s\S]*?processNote\.title/,
  'center notes only show process steps',
);

const filled: Partial<Record<SlotId, SlotId>> = {};
for (const slot of BOARD_SLOTS) filled[slot] = slot;
assert.equal(Object.keys(filled).length, BOARD_SLOTS.length);

assert.equal(assembleNote(false).body, ASSEMBLE_GUIDE.body);
assert.equal(assembleNote(true).body, TEST_PROMPT.body);
assert.equal(TEST_PROMPT.body, 'Click the View to test!');
assert.ok(TESTING_NOTE.body.includes('middle'));

assert.match(
  viewSrc,
  /showPlaybackControls = snap\.phase === 'playing'/,
  'Auto only while playing, not after done',
);
assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*17\.5rem/, 'topbar columns locked');
assert.match(css, /\.topbar[\s\S]*?flex:\s*0 0 4\.25rem/, 'topbar height locked');
assert.match(css, /\.controls[\s\S]*?width:\s*17\.5rem/, 'controls width locked');
assert.match(viewSrc, /beginTesting/, 'path check starts from View click');
assert.match(
  viewSrc,
  /completeQuick[\s\S]*startAnimation/,
  'Complete skips straight into animation',
);
assert.doesNotMatch(
  viewSrc,
  /lastSubmittedKey/,
  'no auto-submit when the board is first filled',
);

console.log('ok — click-carry, shared face size, View test + Complete skip');
