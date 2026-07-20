/**
 * Automated checks for domain rules and both use cases.
 * Run: npx tsx scripts/check-ca.mts
 */
import assert from 'node:assert/strict';
import {
  isArrangementComplete,
  matchesCorrectOrder,
  arrangementSequence,
  firstWrongSlot,
  returnWrongFromOnward,
} from '../src/domain/entities/Arrangement.ts';
import { BOARD_SLOTS } from '../src/domain/entities/PieceKind.ts';
import { InMemoryCorrectOrderGateway } from '../src/adapters/gateways/InMemoryCorrectOrderGateway.ts';
import { ValidateArrangementInteractor } from '../src/application/usecases/ValidateArrangementInteractor.ts';
import {
  FLOW_FRAMES,
  PlayFlowAnimationInteractor,
} from '../src/application/usecases/PlayFlowAnimationInteractor.ts';
import type { ValidationOutputData } from '../src/application/dto/ArrangementDtos.ts';
import type { AnimationOutputData } from '../src/application/ports/PlayAnimationPorts.ts';

const gateway = new InMemoryCorrectOrderGateway();
const correct = gateway.getCorrectOrder();

assert.equal(isArrangementComplete({}, BOARD_SLOTS), false);
assert.equal(isArrangementComplete(correct, BOARD_SLOTS), true);
assert.equal(matchesCorrectOrder(correct, correct, BOARD_SLOTS), true);
assert.equal(
  matchesCorrectOrder({ ...correct, con: 'db' }, correct, BOARD_SLOTS),
  false,
);
assert.deepEqual(arrangementSequence(correct, BOARD_SLOTS), [...BOARD_SLOTS]);

assert.equal(firstWrongSlot(correct, BOARD_SLOTS), null);
assert.equal(
  firstWrongSlot({ ...correct, present: 'db', db: 'present' }, BOARD_SLOTS),
  'db',
);
assert.deepEqual(
  returnWrongFromOnward(
    { ...correct, present: 'db', db: 'present' },
    BOARD_SLOTS,
    'db',
  ),
  Object.fromEntries(
    BOARD_SLOTS.filter((s) => s !== 'db' && s !== 'present').map((s) => [s, s]),
  ),
);

let validationOut: ValidationOutputData | null = null;
const validate = new ValidateArrangementInteractor(gateway, {
  present(output) {
    validationOut = output;
  },
});

validate.execute({
  arrangement: { con: 'con', inputb: 'inputb' },
});
assert.equal(validationOut?.result.ok, false);
if (validationOut && !validationOut.result.ok) {
  assert.equal(validationOut.result.reason, 'incomplete');
}

validate.execute({
  arrangement: { ...correct, entity: 'da', da: 'entity' },
});
assert.equal(validationOut?.result.ok, false);
if (validationOut && !validationOut.result.ok) {
  assert.equal(validationOut.result.reason, 'mismatch');
}

validate.execute({ arrangement: correct });
assert.equal(validationOut?.result.ok, true);

let animOut: AnimationOutputData | null = null;
const play = new PlayFlowAnimationInteractor({
  present(output) {
    animOut = output;
  },
});
play.execute();
assert.ok(animOut);
assert.equal(animOut!.frames.length, FLOW_FRAMES.length);
assert.equal(animOut!.frames[0]?.edge, 0);
assert.equal(animOut!.frames[0]?.focus, null);
assert.equal(animOut!.frames.at(-1)?.images.view, 'viewoutend.PNG');
assert.equal(animOut!.frames.at(-1)?.focus, 'view');

const lastImages = animOut!.frames.at(-1)!.images;
assert.equal(lastImages.con, 'con1.PNG');
assert.equal(lastImages.inputb, 'inputb1.PNG');
assert.equal(lastImages.uc, 'uc.PNG');
assert.equal(lastImages.da, 'da.PNG');
assert.equal(lastImages.dainter, 'dainter.PNG');
assert.equal(lastImages.db, 'db.PNG');
assert.equal(lastImages.entity, 'entity.PNG');
assert.equal(lastImages.output, 'output1.PNG');
assert.equal(lastImages.present, 'present.PNG');
assert.equal(lastImages.view, 'viewoutend.PNG');

const focuses = FLOW_FRAMES.map((f) => f.focus).filter(Boolean);
assert.ok(focuses.includes('con'));
assert.ok(focuses.includes('da'));
assert.ok(focuses.includes('entity'));
assert.ok(focuses.includes('present'));

for (let i = 0; i < FLOW_FRAMES.length; i++) {
  const f = FLOW_FRAMES[i]!;
  assert.ok(
    (f.focus !== null) !== (f.edge !== null),
    `frame ${i} must be either arrow or box, not both/neither`,
  );
}

console.log(`ok — ${FLOW_FRAMES.length} frames, validation paths covered`);
