import type { PieceKind, SlotId } from '../../domain/entities/PieceKind';
import { RING_ORDER } from '../../domain/entities/PieceKind';

/** Idle PNG shown while assembling (before control-flow image swaps). */
export const IDLE_IMAGE: Readonly<Record<string, string>> = {
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
};

/** Cache-bust so the browser does not keep old cropped files. */
const PIC_VER = 'newArt0266';

export function picSrc(filename: string): string {
  return `/pics/${encodeURIComponent(filename)}?v=${PIC_VER}`;
}

export function idleSrc(kind: string): string {
  return picSrc(IDLE_IMAGE[kind] ?? `${kind}.PNG`);
}

/** Process ring edges: each step points to the next (last → view). */
export const PROCESS_EDGES: ReadonlyArray<readonly [PieceKind, PieceKind]> =
  RING_ORDER.map((from, i) => {
    const to = RING_ORDER[(i + 1) % RING_ORDER.length]!;
    return [from, to] as const;
  });

/** Order of pieces in the center pile — same as notes / ring process order. */
export const PILE_ORDER: readonly SlotId[] = [
  'con',
  'inputb',
  'uc',
  'dainter',
  'da',
  'db',
  'entity',
  'output',
  'present',
];

/**
 * Polar placement. Radius stays inside the board so bottom cells do not clip.
 */
const RING_RADIUS = 41;

/** Extra % offsets — keep neighbours apart without pushing past the board. */
const RING_NUDGE: Readonly<Partial<Record<PieceKind, { x: number; y: number }>>> = {
  dainter: { x: -1.0, y: -1.2 },
  db: { x: 2.2, y: 0 },
};

export function ringPosition(
  index: number,
  total: number,
  kind?: PieceKind,
): { left: string; top: string } {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  let x = 50 + RING_RADIUS * Math.cos(angle);
  let y = 50 + RING_RADIUS * Math.sin(angle);
  const nudge = kind ? RING_NUDGE[kind] : undefined;
  if (nudge) {
    x += nudge.x;
    y += nudge.y;
  }
  return { left: `${x}%`, top: `${y}%` };
}
