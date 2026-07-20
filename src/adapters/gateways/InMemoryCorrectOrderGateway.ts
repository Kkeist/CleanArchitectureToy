import type { SlotId } from '../../domain/entities/PieceKind';
import { BOARD_SLOTS } from '../../domain/entities/PieceKind';
import type { CorrectOrderGateway } from '../../application/ports/CorrectOrderGateway';

/**
 * Local data access: each board slot expects the piece of the same kind.
 * That mapping is the "correct order" stored outside the use case.
 */
export class InMemoryCorrectOrderGateway implements CorrectOrderGateway {
  getBoardSlots(): readonly SlotId[] {
    return BOARD_SLOTS;
  }

  getCorrectOrder(): Readonly<Record<SlotId, SlotId>> {
    return {
      con: 'con',
      inputb: 'inputb',
      uc: 'uc',
      dainter: 'dainter',
      da: 'da',
      db: 'db',
      entity: 'entity',
      output: 'output',
      present: 'present',
    };
  }
}
