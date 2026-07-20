import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Arrangement } from '../../domain/entities/Arrangement';
import type { PieceKind, SlotId } from '../../domain/entities/PieceKind';
import { BOARD_SLOTS, RING_ORDER } from '../../domain/entities/PieceKind';
import {
  isArrangementComplete,
  returnWrongFromOnward,
} from '../../domain/entities/Arrangement';
import type { AssemblyController } from '../../adapters/controllers/AssemblyController';
import type { AssemblyViewModel } from './AssemblyViewModel';
import {
  CELL_OF_BOARD,
  idleSrc,
  picSrc,
  PILE_ORDER,
  PROCESS_EDGES,
  ringPosition,
} from './assets';
import { assembleNote, processNoteForFrame, TESTING_NOTE } from './centerNotes';

const AUTO_MS = 1100;
const TEST_MS = 750;

type DragPayload =
  | { from: 'pile'; kind: SlotId }
  | { from: 'slot'; slot: SlotId; kind: SlotId };

interface Props {
  viewModel: AssemblyViewModel;
  controller: AssemblyController;
}

interface ArrowGeom {
  d: string;
  mx: number;
  my: number;
  angle: number;
}

function slotFromPoint(x: number, y: number): SlotId | null {
  const el = document.elementFromPoint(x, y);
  const host = el?.closest('[data-slot]') as HTMLElement | null;
  const slot = host?.dataset.slot;
  return slot && (BOARD_SLOTS as readonly string[]).includes(slot)
    ? (slot as SlotId)
    : null;
}

function edgePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  inset1: number,
  inset2: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const maxInset = Math.max(0, (len - 56) / 2);
  const a = Math.min(inset1, maxInset);
  const b = Math.min(inset2, maxInset);
  return {
    x1: x1 + ux * a,
    y1: y1 + uy * a,
    x2: x2 - ux * b,
    y2: y2 - uy * b,
  };
}

/** Curve between cells; arrow head sits at the mid-point of the curve. */
function arrowBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
): ArrowGeom {
  const mxChord = (x1 + x2) / 2;
  const myChord = (y1 + y2) / 2;
  const vx = mxChord - cx;
  const vy = myChord - cy;
  const len = Math.hypot(vx, vy) || 1;
  const chord = Math.hypot(x2 - x1, y2 - y1);
  const bulge = 0.58;
  const qx = mxChord + (vx / len) * chord * bulge;
  const qy = myChord + (vy / len) * chord * bulge;
  const mx = 0.25 * x1 + 0.5 * qx + 0.25 * x2;
  const my = 0.25 * y1 + 0.5 * qy + 0.25 * y2;
  const tx = 0.5 * (qx - x1) + 0.5 * (x2 - qx);
  const ty = 0.5 * (qy - y1) + 0.5 * (y2 - qy);
  const angle = (Math.atan2(ty, tx) * 180) / Math.PI;
  return {
    d: `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`,
    mx,
    my,
    angle,
  };
}

/** Destination part of a process edge (the seat the arrow points to). */
function edgeDestination(edgeIndex: number): PieceKind {
  return RING_ORDER[(edgeIndex + 1) % RING_ORDER.length]!;
}

export function AssemblyView({ viewModel, controller }: Props) {
  const snap = useSyncExternalStore(viewModel.subscribe, viewModel.getSnapshot);
  const [arrangement, setArrangement] = useState<Arrangement>({});
  const [carry, setCarry] = useState<DragPayload | null>(null);
  const [hoverSlot, setHoverSlot] = useState<SlotId | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; kind: SlotId } | null>(
    null,
  );
  const carryRef = useRef<DragPayload | null>(null);
  const dropArmedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingFailRef = useRef<Arrangement | null>(null);
  const [arrows, setArrows] = useState<ArrowGeom[]>([]);

  const placed = new Set(
    BOARD_SLOTS.map((s) => arrangement[s]).filter(Boolean) as SlotId[],
  );
  const pile = PILE_ORDER.filter((k) => !placed.has(k));
  const boardFull = isArrangementComplete(arrangement, BOARD_SLOTS);

  const images =
    snap.phase === 'playing' || snap.phase === 'done'
      ? snap.frames[snap.frameIndex]?.images
      : undefined;
  const currentFrame =
    snap.phase === 'playing' || snap.phase === 'done'
      ? snap.frames[snap.frameIndex]
      : undefined;
  const focus = currentFrame?.focus ?? undefined;
  const activeEdgeIndex =
    snap.phase === 'testing'
      ? snap.testEdgeIndex
      : currentFrame?.edge !== null && currentFrame?.edge !== undefined
        ? currentFrame.edge
        : -1;

  const linked =
    snap.phase === 'ready' ||
    snap.phase === 'testing' ||
    snap.phase === 'playing' ||
    snap.phase === 'done';

  const resolveSrc = (part: string): string => {
    if (images?.[part]) return picSrc(images[part]);
    return idleSrc(part);
  };

  // Path check: highlight each process arrow; wrong seat → return wrong parts.
  useEffect(() => {
    if (snap.phase !== 'testing') return;
    if (snap.testEdgeIndex < 0) return;

    const edge = snap.testEdgeIndex;
    const dest = edgeDestination(edge);
    const t = window.setTimeout(() => {
      if (dest !== 'view') {
        const slot = dest as SlotId;
        if (arrangement[slot] !== slot) {
          pendingFailRef.current = returnWrongFromOnward(
            arrangement,
            BOARD_SLOTS,
            slot,
          );
          viewModel.setTestFailure();
          return;
        }
      }
      const next = edge + 1;
      if (next >= PROCESS_EDGES.length) {
        controller.submitArrangement(arrangement);
        return;
      }
      viewModel.setTestEdgeIndex(next);
    }, TEST_MS);

    return () => window.clearTimeout(t);
  }, [
    snap.phase,
    snap.testEdgeIndex,
    arrangement,
    controller,
    viewModel,
  ]);

  // All seats correct after path check → play the process animation.
  useEffect(() => {
    if (snap.phase === 'ready') {
      controller.startAnimation();
    }
  }, [snap.phase, controller]);

  // Failed path check: drop wrong parts, then unlock assemble again.
  useEffect(() => {
    if (snap.phase !== 'reject') return;
    const cleared = pendingFailRef.current;
    pendingFailRef.current = null;
    if (cleared) setArrangement(cleared);
    const t = window.setTimeout(() => viewModel.returnToAssemble(), 650);
    return () => window.clearTimeout(t);
  }, [snap.phase, snap.rejectToken, viewModel]);

  useEffect(() => {
    if (snap.phase !== 'playing' || !snap.autoPlay) return;
    if (snap.frames.length === 0) return;
    const t = window.setTimeout(() => {
      viewModel.setFrameIndex(snap.frameIndex + 1);
    }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [snap.phase, snap.autoPlay, snap.frameIndex, snap.frames.length, viewModel]);

  const measureArrows = useCallback(() => {
    const board = boardRef.current;
    if (!board) {
      setArrows([]);
      return;
    }
    const br = board.getBoundingClientRect();
    const cx = br.width / 2;
    const cy = br.height / 2;
    const pts: Record<string, { x: number; y: number; inset: number }> = {};
    for (const id of RING_ORDER) {
      const el = nodeRefs.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      pts[id] = {
        x: r.left + r.width / 2 - br.left,
        y: r.top + r.height / 2 - br.top,
        inset: Math.min(r.width, r.height) * 0.42,
      };
    }
    const next: ArrowGeom[] = [];
    for (const [a, b] of PROCESS_EDGES) {
      const pa = pts[a];
      const pb = pts[b];
      if (!pa || !pb) continue;
      const e = edgePoints(pa.x, pa.y, pb.x, pb.y, pa.inset, pb.inset);
      next.push(arrowBetween(e.x1, e.y1, e.x2, e.y2, cx, cy));
    }
    setArrows(next);
  }, [arrangement, snap.phase, images]);

  useEffect(() => {
    measureArrows();
    const onResize = () => measureArrows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureArrows]);

  /**
   * --cell tracks the board edge only. Ghost lives outside .board, so the
   * value is written on .app and every face (pile / ring / ghost) shares it.
   */
  useEffect(() => {
    const board = boardRef.current;
    const app = board?.closest('.app') as HTMLElement | null;
    if (!board || !app) return;

    const syncCell = () => {
      const edge = Math.min(board.clientWidth, board.clientHeight);
      app.style.setProperty('--cell', `${Math.max(1, edge * CELL_OF_BOARD)}px`);
      requestAnimationFrame(() => measureArrows());
    };

    syncCell();
    const ro = new ResizeObserver(syncCell);
    ro.observe(board);
    return () => {
      ro.disconnect();
      app.style.removeProperty('--cell');
    };
  }, [measureArrows]);

  const placeIntoSlot = useCallback((slot: SlotId, payload: DragPayload) => {
    setArrangement((prev) => {
      const next: Partial<Record<SlotId, SlotId>> = { ...prev };
      if (payload.from === 'slot') {
        delete next[payload.slot];
      }
      const displaced = next[slot];
      next[slot] = payload.kind;
      if (displaced && payload.from === 'slot' && payload.slot !== slot) {
        next[payload.slot] = displaced;
      }
      return next;
    });
  }, []);

  const clearCarry = useCallback(() => {
    carryRef.current = null;
    dropArmedRef.current = false;
    setCarry(null);
    setHoverSlot(null);
    setGhost(null);
  }, []);

  /**
   * Click picks up; ghost follows without holding.
   * Next click on a slot places; click on empty returns home.
   */
  useEffect(() => {
    if (!carry) return;

    const onMove = (e: PointerEvent) => {
      setGhost({ x: e.clientX, y: e.clientY, kind: carry.kind });
      setHoverSlot(slotFromPoint(e.clientX, e.clientY));
    };

    const onDropClick = (e: PointerEvent) => {
      if (!dropArmedRef.current || !carryRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const payload = carryRef.current;
      const target = slotFromPoint(e.clientX, e.clientY);
      if (target) {
        placeIntoSlot(target, payload);
      }
      clearCarry();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDropClick, true);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDropClick, true);
    };
  }, [carry, placeIntoSlot, clearCarry]);

  const locked =
    snap.phase === 'ready' ||
    snap.phase === 'testing' ||
    snap.phase === 'playing' ||
    snap.phase === 'done';

  const pickUp = (payload: DragPayload, e: ReactPointerEvent) => {
    if (locked || snap.phase === 'reject') return;
    e.preventDefault();
    e.stopPropagation();
    if (carryRef.current) {
      clearCarry();
      return;
    }
    dropArmedRef.current = false;
    carryRef.current = payload;
    setCarry(payload);
    setGhost({ x: e.clientX, y: e.clientY, kind: payload.kind });
    setHoverSlot(slotFromPoint(e.clientX, e.clientY));
    window.setTimeout(() => {
      if (carryRef.current === payload) dropArmedRef.current = true;
    }, 0);
  };

  const restart = () => {
    pendingFailRef.current = null;
    setArrangement({});
    clearCarry();
    viewModel.resetPlayback();
  };

  /** Skip the puzzle and jump straight into the process animation. */
  const completeQuick = () => {
    if (locked || snap.phase === 'reject') return;
    clearCarry();
    const filled: Partial<Record<SlotId, SlotId>> = {};
    for (const slot of BOARD_SLOTS) {
      filled[slot] = slot;
    }
    setArrangement(filled);
    controller.startAnimation();
  };

  const startViewTest = () => {
    if (snap.phase !== 'assemble' || !boardFull || carry) return;
    clearCarry();
    viewModel.beginTesting();
  };

  const continueStep = () => {
    if (snap.phase === 'playing') {
      viewModel.setFrameIndex(snap.frameIndex + 1);
    }
  };

  const setNode = (id: string) => (el: HTMLElement | null) => {
    nodeRefs.current[id] = el;
  };

  const processHot = snap.phase === 'playing' || snap.phase === 'done';
  const testingHot = snap.phase === 'testing';
  const canTestView = snap.phase === 'assemble' && boardFull && !carry;
  const showGuide =
    snap.phase === 'assemble' || snap.phase === 'testing' || snap.phase === 'reject';
  const guide =
    snap.phase === 'testing' ? TESTING_NOTE : assembleNote(boardFull);
  const showProcessNotes = processHot;
  const processNote = processNoteForFrame(snap.phase, snap.frameIndex);
  /** Auto/Next only while the process animation is running — not after it ends. */
  const showPlaybackControls = snap.phase === 'playing';

  return (
    <div className={`app ${snap.phase === 'reject' ? 'is-reject' : ''}`}>
      <header className="topbar">
        <p className="top-guide" aria-live="polite">
          {showGuide ? guide.body : '\u00a0'}
        </p>
        <div className="controls">
          {!locked && snap.phase !== 'reject' && (
            <button type="button" className="btn accent" onClick={completeQuick}>
              Complete
            </button>
          )}
          {showPlaybackControls && (
            <button
              type="button"
              className="btn active"
              onClick={() => viewModel.setAutoPlay(!snap.autoPlay)}
            >
              {snap.autoPlay ? 'Auto' : 'Continue'}
            </button>
          )}
          {showPlaybackControls && !snap.autoPlay && (
            <button type="button" className="btn accent" onClick={continueStep}>
              Next
            </button>
          )}
          {snap.phase === 'done' && (
            <button type="button" className="btn accent" onClick={restart}>
              Restart
            </button>
          )}
        </div>
      </header>

      <main className="stage">
        <div className={`board ${linked ? 'linked' : ''}`} ref={boardRef}>
          <svg className="wires" aria-hidden>
            {arrows.map((a, i) => {
              const hot = (processHot || testingHot) && i === activeEdgeIndex;
              return (
                <g key={i}>
                  <path d={a.d} className={`wire ${hot ? 'hot' : 'guide'}`} />
                  <g transform={`translate(${a.mx} ${a.my}) rotate(${a.angle})`}>
                    <path
                      d="M -7 -5 L 9 0 L -7 5 Z"
                      className={hot ? 'arrow-head-hot' : 'arrow-head'}
                    />
                  </g>
                </g>
              );
            })}
          </svg>

          <div className="hub">
            {showProcessNotes && (
              <div className="notes">
                <h2 className="notes-title">{processNote.title}</h2>
                <p className="notes-p">{processNote.body}</p>
              </div>
            )}

            {!locked && pile.length > 0 && (
              <div className="pile">
                {pile.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`pile-piece ${
                      carry?.from === 'pile' && carry.kind === kind ? 'dragging' : ''
                    }`}
                    onPointerDown={(e) => pickUp({ from: 'pile', kind }, e)}
                  >
                    <img src={idleSrc(kind)} alt="" draggable={false} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {RING_ORDER.map((part, index) => {
            const pos = ringPosition(index, RING_ORDER.length, part);
            const style: CSSProperties = {
              left: pos.left,
              top: pos.top,
            };

            if (part === 'view') {
              return (
                <BoardCell
                  key={part}
                  id="view"
                  className={`cell view ${canTestView ? 'testable' : ''}`}
                  style={style}
                  src={resolveSrc('view')}
                  focused={focus === 'view' || canTestView}
                  setNode={setNode}
                  onPointerDown={
                    canTestView
                      ? (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startViewTest();
                        }
                      : undefined
                  }
                />
              );
            }

            const slot = part as SlotId;
            return (
              <DropCell
                key={slot}
                id={slot}
                className={`cell ${slot}`}
                style={style}
                slot={slot}
                arrangement={arrangement}
                resolveSrc={resolveSrc}
                focus={focus}
                hoverSlot={hoverSlot}
                locked={locked}
                frameArt={processHot}
                carryingKind={carry?.kind ?? null}
                setNode={setNode}
                onPointerDown={(e) => {
                  const kind = arrangement[slot];
                  if (!kind || locked) return;
                  pickUp({ from: 'slot', slot, kind }, e);
                }}
              />
            );
          })}
        </div>
      </main>

      {ghost && (
        <div
          className="ghost"
          style={{ transform: `translate(${ghost.x}px, ${ghost.y}px)` }}
          aria-hidden
        >
          <img src={idleSrc(ghost.kind)} alt="" draggable={false} />
        </div>
      )}
    </div>
  );
}

function BoardCell(props: {
  id: string;
  className: string;
  style: CSSProperties;
  src: string;
  focused?: boolean;
  setNode: (id: string) => (el: HTMLElement | null) => void;
  onPointerDown?: (e: ReactPointerEvent) => void;
}) {
  return (
    <div
      className={`${props.className} ${props.focused ? 'focus' : ''}`}
      style={props.style}
      ref={props.setNode(props.id)}
      onPointerDown={props.onPointerDown}
    >
      <img src={props.src} alt="" draggable={false} />
    </div>
  );
}

function DropCell(props: {
  id: string;
  className: string;
  style: CSSProperties;
  slot: SlotId;
  arrangement: Arrangement;
  resolveSrc: (part: string) => string;
  focus?: string;
  hoverSlot: SlotId | null;
  locked: boolean;
  /** When true, seat shows process-animation art for this slot id. */
  frameArt: boolean;
  carryingKind: SlotId | null;
  setNode: (id: string) => (el: HTMLElement | null) => void;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  const kind = props.arrangement[props.slot];
  const filled = Boolean(kind);
  const lifted = filled && props.carryingKind === kind;
  const showImg = props.frameArt
    ? props.resolveSrc(props.slot)
    : kind && !lifted
      ? idleSrc(kind)
      : null;

  return (
    <div
      data-slot={props.slot}
      className={`${props.className} drop ${filled ? 'filled' : 'empty'} ${
        props.focus === props.slot ? 'focus' : ''
      } ${props.hoverSlot === props.slot ? 'hover' : ''}`}
      style={props.style}
      ref={props.setNode(props.id)}
      onPointerDown={filled && !props.locked ? props.onPointerDown : undefined}
    >
      {showImg ? <img src={showImg} alt="" draggable={false} /> : null}
    </div>
  );
}
