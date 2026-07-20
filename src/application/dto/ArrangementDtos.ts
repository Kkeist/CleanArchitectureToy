import type { SlotId } from '../../domain/entities/PieceKind';
import type { Arrangement } from '../../domain/entities/Arrangement';

/** Raw arrangement handed from the controller into the use case. */
export interface ArrangementInputData {
  arrangement: Arrangement;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: 'incomplete' | 'mismatch' };

export interface ValidationOutputData {
  result: ValidationResult;
  /** Sequence the player submitted (filled slots only). */
  submitted: SlotId[];
}
