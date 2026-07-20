/**
 * Identifiers for each Clean Architecture part used on the assembly board.
 * Values match asset name stems under /pics (without state suffixes).
 */
export type PieceKind =
  | 'view'
  | 'con'
  | 'inputb'
  | 'uc'
  | 'da'
  | 'dainter'
  | 'db'
  | 'entity'
  | 'output'
  | 'present';

/**
 * Drop targets the player fills. View stays fixed as the ring start.
 * Order follows the control-flow ring used by process arrows.
 */
export type SlotId =
  | 'con'
  | 'inputb'
  | 'uc'
  | 'da'
  | 'dainter'
  | 'db'
  | 'entity'
  | 'output'
  | 'present';

export const DRAGGABLE_KINDS: readonly SlotId[] = [
  'con',
  'inputb',
  'uc',
  'dainter',
  'da',
  'db',
  'entity',
  'output',
  'present',
] as const;

export const BOARD_SLOTS: readonly SlotId[] = DRAGGABLE_KINDS;

/** Full ring including the fixed View start (clockwise process order). */
export const RING_ORDER: readonly PieceKind[] = [
  'view',
  'con',
  'inputb',
  'uc',
  'dainter',
  'da',
  'db',
  'entity',
  'output',
  'present',
] as const;
