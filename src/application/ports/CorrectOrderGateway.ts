import type { SlotId } from '../../domain/entities/PieceKind';

/** Gateway the use case uses to load the canonical CA slot mapping. */
export interface CorrectOrderGateway {
  getCorrectOrder(): Readonly<Record<SlotId, SlotId>>;
  getBoardSlots(): readonly SlotId[];
}
