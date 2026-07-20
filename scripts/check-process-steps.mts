/**
 * Validates FLOW_FRAMES: arrow/box are exclusive, steps never decrease,
 * and call overlays put the box on the animating part.
 */
import assert from 'node:assert/strict';
import { FLOW_FRAMES } from '../src/application/usecases/PlayFlowAnimationInteractor.ts';
import {
  PROCESS_BY_FRAME,
  processNoteForFrame,
} from '../src/frameworks/ui/centerNotes.ts';
import { RING_ORDER } from '../src/domain/entities/PieceKind.ts';
import { PILE_ORDER } from '../src/frameworks/ui/assets.ts';

assert.equal(PROCESS_BY_FRAME.length, FLOW_FRAMES.length);

// Notes order: UC → Data Access Interface → Data Access → Database.
assert.deepEqual(
  RING_ORDER.slice(3, 7),
  ['uc', 'dainter', 'da', 'db'],
  'ring follows notes: UC → DA Interface → DA → DB',
);
assert.deepEqual(
  PILE_ORDER.slice(2, 6),
  ['uc', 'dainter', 'da', 'db'],
  'pile follows the same notes order',
);

let prevStep = 0;
let sawArrow = false;
let sawBox = false;

for (let i = 0; i < FLOW_FRAMES.length; i++) {
  const frame = FLOW_FRAMES[i]!;
  const hasFocus = frame.focus !== null;
  const hasEdge = frame.edge !== null;

  assert.ok(
    hasFocus !== hasEdge,
    `frame ${i}: arrow and box must not show together (focus=${frame.focus}, edge=${frame.edge})`,
  );

  if (hasFocus) {
    sawBox = true;
    assert.ok(
      RING_ORDER.includes(frame.focus as (typeof RING_ORDER)[number]),
      `frame ${i}: unknown focus ${frame.focus}`,
    );
  }
  if (hasEdge) {
    sawArrow = true;
    assert.ok(
      frame.edge! >= 0 && frame.edge! < RING_ORDER.length,
      `frame ${i}: bad edge ${frame.edge}`,
    );
  }

  const note = processNoteForFrame('playing', i);
  const m = /Step (\d+)/.exec(note.title);
  assert.ok(m, `frame ${i} missing Step N: ${note.title}`);
  const step = Number(m![1]);
  assert.ok(
    step >= prevStep,
    `step jumped backwards at frame ${i}: ${prevStep} → ${step}`,
  );
  prevStep = step;

  const kind = hasFocus ? 'BOX' : 'ARROW';
  const detail = hasFocus
    ? `focus=${frame.focus}`
    : `edge=${RING_ORDER[frame.edge!]!}→${RING_ORDER[(frame.edge! + 1) % RING_ORDER.length]!}`;
  console.log(`${String(i).padStart(2)} ${kind.padEnd(5)} ${detail.padEnd(22)} ${note.title}`);
}

assert.ok(sawArrow, 'expected at least one arrow beat');
assert.ok(sawBox, 'expected at least one box beat');

// Step increases normally land on arrows; UC jumps (5, 6) start on a box.
let lastStep = 0;
for (let i = 0; i < FLOW_FRAMES.length; i++) {
  const note = processNoteForFrame('playing', i);
  const step = Number(/Step (\d+)/.exec(note.title)![1]);
  if (step > lastStep && lastStep > 0) {
    const ucJump = step === 5 || step === 6;
    if (ucJump) {
      assert.equal(
        FLOW_FRAMES[i]!.focus !== null,
        true,
        `UC jump step ${lastStep}→${step} starts on a box (no previous arrow)`,
      );
    } else {
      assert.equal(
        FLOW_FRAMES[i]!.edge !== null,
        true,
        `step ${lastStep}→${step} must appear on an arrow frame (index ${i})`,
      );
    }
  }
  lastStep = step;
}

// No ring arrows for UC jumps past Database / Entity.
assert.ok(
  FLOW_FRAMES.every((f) => {
    if (f.edge === null) return true;
    const from = RING_ORDER[f.edge]!;
    const to = RING_ORDER[(f.edge + 1) % RING_ORDER.length]!;
    return !(
      (from === 'db' && to === 'entity') ||
      (from === 'entity' && to === 'output')
    );
  }),
  'UC jumps skip Database→Entity and Entity→Output arrows',
);

// Call overlays: box follows the animating part.
const daCall = FLOW_FRAMES.find((f) => f.images.da === 'da-uccall.PNG' && f.focus);
assert.equal(daCall?.focus, 'da');
const daReturn = FLOW_FRAMES.find((f) => f.images.da === 'da-ucinter.PNG' && f.focus);
assert.equal(daReturn?.focus, 'da');
const ucOut = FLOW_FRAMES.find((f) => f.images.uc === 'ucinter-out.PNG' && f.focus);
assert.equal(ucOut?.focus, 'uc');

const idx = (pred: (f: (typeof FLOW_FRAMES)[number]) => boolean) =>
  FLOW_FRAMES.findIndex(pred);
const iUcIn = idx((f) => f.images.uc === 'ucinter-in.PNG' && f.focus === 'uc');
const iDaInter = idx(
  (f) => f.images.dainter === 'da-dainter.PNG' && f.focus === 'dainter',
);
const iDaCall = idx((f) => f.images.da === 'da-uccall.PNG' && f.focus === 'da');
const iDaReturn = idx((f) => f.images.da === 'da-ucinter.PNG' && f.focus === 'da');
assert.ok(iUcIn >= 0 && iDaCall > iUcIn, 'UC call reaches DA before Interface');
assert.ok(iDaInter > iDaCall, 'DA enters Interface after DA call');
assert.ok(iDaReturn > iDaInter, 'DA return after Interface / DB work');

// After DB, DA calls back and UC answers on the next beat.
assert.equal(FLOW_FRAMES[iDaReturn + 1]?.focus, 'uc');
assert.equal(FLOW_FRAMES[iDaReturn + 1]?.images.uc, 'ucinter-in.PNG');
assert.equal(
  FLOW_FRAMES[iDaReturn]?.images.uc,
  'uc.PNG',
  'UC is idle when DA starts the return call',
);

const iHangUpAfterDa = FLOW_FRAMES.findIndex(
  (f, i) =>
    i > iDaReturn &&
    f.focus === 'da' &&
    f.images.da === 'da.PNG' &&
    f.images.uc === 'uc.PNG',
);
assert.ok(iHangUpAfterDa > iDaReturn, 'DA return call hangs up in one beat');
assert.equal(
  FLOW_FRAMES[iHangUpAfterDa - 1]?.focus,
  'uc',
  'hang-up comes right after UC answers',
);
const iUcHangUpAfterDa = iHangUpAfterDa;

const iUcEntityCall = FLOW_FRAMES.findIndex(
  (f, i) =>
    i > iUcHangUpAfterDa && f.focus === 'uc' && f.images.uc === 'ucinter-in.PNG',
);
assert.ok(iUcEntityCall > iUcHangUpAfterDa, 'UC shows a new call before Entity');
// Called party jumps straight to action art (no idle entity flash).
const iEntity = idx((f) => f.focus === 'entity' && f.images.entity === 'entity1.PNG');
assert.ok(iEntity > iUcEntityCall, 'Entity after UC new-call beat');
assert.equal(FLOW_FRAMES[iUcEntityCall - 1]?.edge, null, 'no arrow before Entity call');
assert.equal(
  FLOW_FRAMES[iEntity - 1]?.focus,
  'uc',
  'Entity call lands immediately after UC picks up',
);

const iHangUpAfterEntity = FLOW_FRAMES.findIndex(
  (f, i) =>
    i > iEntity &&
    f.focus === 'entity' &&
    f.images.entity === 'entity.PNG' &&
    f.images.uc === 'ucinter-in.PNG',
);
assert.ok(iHangUpAfterEntity > iEntity, 'Entity finishes before UC hangs up');
const iUcHangUpAfterEntity = FLOW_FRAMES.findIndex(
  (f, i) =>
    i > iHangUpAfterEntity &&
    f.focus === 'entity' &&
    f.images.entity === 'entity.PNG' &&
    f.images.uc === 'uc.PNG',
);
assert.ok(iUcHangUpAfterEntity > iHangUpAfterEntity, 'UC hangs up after Entity');

// Output: UC call → out1 → UC idle → out2/out3 (animation only after UC recovers).
const iUcOut = FLOW_FRAMES.findIndex(
  (f, i) =>
    i > iUcHangUpAfterEntity && f.focus === 'uc' && f.images.uc === 'ucinter-out.PNG',
);
assert.ok(iUcOut > iUcHangUpAfterEntity, 'UC shows a new call before Output');
assert.equal(FLOW_FRAMES[iUcOut - 1]?.edge, null, 'no arrow before Output call');
const iOut1 = FLOW_FRAMES.findIndex(
  (f, i) => i > iUcOut && f.focus === 'output' && f.images.output === 'output1.PNG',
);
assert.ok(iOut1 > iUcOut, 'Output answers after UC picks up');
const iUcIdleAfterOut = FLOW_FRAMES.findIndex(
  (f, i) => i > iOut1 && f.focus === 'uc' && f.images.uc === 'uc.PNG',
);
assert.ok(iUcIdleAfterOut > iOut1, 'UC recovers before Output animation');
const iOut2 = FLOW_FRAMES.findIndex(
  (f, i) => i > iUcIdleAfterOut && f.focus === 'output' && f.images.output === 'output2.PNG',
);
const iOut3 = FLOW_FRAMES.findIndex(
  (f, i) => i > iOut2 && f.focus === 'output' && f.images.output === 'output3.PNG',
);
assert.ok(iOut2 > iUcIdleAfterOut, 'output2 only after UC recovers');
assert.ok(iOut3 > iOut2, 'output3 after output2');
assert.equal(FLOW_FRAMES[iOut2]?.images.uc, 'uc.PNG', 'UC stays idle during out animation');
assert.equal(FLOW_FRAMES[iOut3]?.images.uc, 'uc.PNG', 'UC stays idle during out animation');
const iPresentCall = idx(
  (f) => f.images.present === 'present-call.PNG' && f.focus === 'present',
);
assert.ok(iPresentCall > iOut3, 'Presenter after Output animation');
assert.equal(
  FLOW_FRAMES[iPresentCall]?.images.uc,
  'uc.PNG',
  'Presenter is not a UC phone call',
);
const iPresentToView = FLOW_FRAMES.findIndex(
  (f, i) => i > iPresentCall && f.edge === 9,
);
assert.ok(iPresentToView > iPresentCall, 'Presenter → View has a process arrow');
assert.equal(FLOW_FRAMES[iPresentToView + 1]?.focus, 'view');
assert.equal(FLOW_FRAMES[iPresentToView + 1]?.images.view, 'viewinput.PNG');
// UC is always the caller before each phone-callee lands.
for (const [callee, callArt] of [
  ['da', 'da-uccall.PNG'],
  ['entity', 'entity1.PNG'],
  ['output', 'output1.PNG'],
] as const) {
  const iLand = idx((f) => f.focus === callee && f.images[callee] === callArt);
  assert.ok(iLand > 0, `${callee} call land exists`);
  const prev = FLOW_FRAMES[iLand - 1]!;
  assert.equal(prev.focus, 'uc', `${callee}: UC must pick up before callee`);
  assert.ok(
    prev.images.uc === 'ucinter-in.PNG' || prev.images.uc === 'ucinter-out.PNG',
    `${callee}: previous beat is UC on a call`,
  );
}

assert.equal(FLOW_FRAMES[0]?.edge, 0);
assert.equal(FLOW_FRAMES.at(-1)?.images.view, 'viewoutend.PNG');
assert.notEqual(FLOW_FRAMES.at(-1)?.images.view, 'view.PNG');
assert.equal(FLOW_FRAMES.at(-1)?.images.present, 'present.PNG');
assert.equal(FLOW_FRAMES.at(-1)?.images.con, 'con1.PNG');
assert.equal(FLOW_FRAMES.at(-1)?.images.uc, 'uc.PNG');

// After an arrow / when a call lands, never waste a beat on idle art already on screen.
for (let i = 0; i < FLOW_FRAMES.length; i++) {
  const f = FLOW_FRAMES[i]!;
  const prev = i > 0 ? FLOW_FRAMES[i - 1] : null;
  if (!prev || prev.edge === null || f.focus === null) continue;
  const focus = f.focus;
  const idle = {
    view: 'view.PNG',
    con: 'con1.PNG',
    inputb: 'inputb1.PNG',
    uc: 'uc.PNG',
    da: 'da.PNG',
    dainter: 'dainter.PNG',
    db: 'db.PNG',
    entity: 'entity.PNG',
    output: 'output1.PNG',
    present: 'present.PNG',
  }[focus];
  if (!idle) continue;
  assert.notEqual(
    f.images[focus],
    idle,
    `frame ${i}: after arrow, ${focus} must show action art, not idle ${idle}`,
  );
}
assert.equal(
  FLOW_FRAMES.find((f) => f.images.da === 'da-uccall.PNG')?.images.da,
  'da-uccall.PNG',
);
assert.ok(
  !FLOW_FRAMES.some(
    (f, i) =>
      i < iDaCall &&
      f.focus === 'da' &&
      f.images.da === 'da.PNG' &&
      i > 0 &&
      FLOW_FRAMES[i - 1]!.images.uc === 'ucinter-in.PNG' &&
      FLOW_FRAMES[i - 1]!.focus === 'uc',
  ),
  'DA call must not show idle da before da-uccall',
);

console.log(`ok — ${FLOW_FRAMES.length} frames, arrow/box exclusive, steps never decrease`);
