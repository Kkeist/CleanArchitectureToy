import type { SlotId } from './PieceKind';

/**
 * Player arrangement: each board slot holds one piece kind, or stays empty.
 * Entity rule: every slot must be filled and match the expected kind for that slot.
 */
export type Arrangement = Readonly<Partial<Record<SlotId, SlotId>>>;

export function isArrangementComplete(
  arrangement: Arrangement,
  slots: readonly SlotId[],
): boolean {
  return slots.every((slot) => arrangement[slot] !== undefined);
}

/**
 * Compares a complete arrangement against the canonical slot→piece mapping.
 * Returns true only when every slot holds its matching piece kind.
 */
export function matchesCorrectOrder(
  arrangement: Arrangement,
  correct: Readonly<Record<SlotId, SlotId>>,
  slots: readonly SlotId[],
): boolean {
  return slots.every((slot) => arrangement[slot] === correct[slot]);
}

/** Ordered list of piece kinds currently placed, one entry per filled slot in board order. */
export function arrangementSequence(
  arrangement: Arrangement,
  slots: readonly SlotId[],
): SlotId[] {
  return slots
    .map((slot) => arrangement[slot])
    .filter((kind): kind is SlotId => kind !== undefined);
}

/**
 * First slot (in board order) that is empty or holds the wrong piece.
 * Correct order for this board is slot id === piece kind.
 */
export function firstWrongSlot(
  arrangement: Arrangement,
  slots: readonly SlotId[],
): SlotId | null {
  for (const slot of slots) {
    if (arrangement[slot] !== slot) return slot;
  }
  return null;
}

/**
 * After a failed path check: keep every correct piece; drop wrong ones
 * from fromSlot onward so they return to the center pile.
 */
export function returnWrongFromOnward(
  arrangement: Arrangement,
  slots: readonly SlotId[],
  fromSlot: SlotId,
): Arrangement {
  const from = slots.indexOf(fromSlot);
  if (from < 0) return arrangement;
  const next: Partial<Record<SlotId, SlotId>> = {};
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    const kind = arrangement[slot];
    if (kind === undefined) continue;
    if (i < from) {
      next[slot] = kind;
      continue;
    }
    if (kind === slot) next[slot] = kind;
  }
  return next;
}
