import type { AnimationFrame } from '../../application/ports/PlayAnimationPorts';

export type Phase = 'assemble' | 'testing' | 'reject' | 'ready' | 'playing' | 'done';

export interface AssemblySnapshot {
  phase: Phase;
  frames: readonly AnimationFrame[];
  frameIndex: number;
  /** Hot process edge while walking the path check (-1 when not testing). */
  testEdgeIndex: number;
  autoPlay: boolean;
  rejectToken: number;
}

const INITIAL: AssemblySnapshot = {
  phase: 'assemble',
  frames: [],
  frameIndex: 0,
  testEdgeIndex: -1,
  autoPlay: true,
  rejectToken: 0,
};

/**
 * Storage the View reads. Presenter writes phase / frames here after use cases finish.
 */
export class AssemblyViewModel {
  private snapshot: AssemblySnapshot = { ...INITIAL };
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AssemblySnapshot => this.snapshot;

  beginTesting(): void {
    this.patch({ phase: 'testing', testEdgeIndex: 0, frames: [], frameIndex: 0 });
  }

  setTestEdgeIndex(testEdgeIndex: number): void {
    this.patch({ testEdgeIndex, phase: 'testing' });
  }

  setValidationSuccess(): void {
    this.patch({ phase: 'ready', frames: [], frameIndex: 0, testEdgeIndex: -1 });
  }

  setValidationFailure(_reason: 'incomplete' | 'mismatch'): void {
    this.patch({
      phase: 'reject',
      frames: [],
      frameIndex: 0,
      testEdgeIndex: -1,
      rejectToken: this.snapshot.rejectToken + 1,
    });
  }

  /** Path check failed: shake, then View returns wrong pieces and calls returnToAssemble. */
  setTestFailure(): void {
    this.patch({
      phase: 'reject',
      testEdgeIndex: -1,
      frames: [],
      frameIndex: 0,
      rejectToken: this.snapshot.rejectToken + 1,
    });
  }

  setAnimationFrames(frames: readonly AnimationFrame[]): void {
    this.patch({
      phase: 'playing',
      frames,
      frameIndex: 0,
      testEdgeIndex: -1,
    });
  }

  setFrameIndex(frameIndex: number): void {
    const last = Math.max(0, this.snapshot.frames.length - 1);
    if (frameIndex >= this.snapshot.frames.length) {
      this.patch({ frameIndex: last, phase: 'done' });
      return;
    }
    this.patch({ frameIndex, phase: 'playing' });
  }

  setAutoPlay(autoPlay: boolean): void {
    this.patch({ autoPlay });
  }

  /** Clears presenter-owned playback state after a full restart from the View. */
  resetPlayback(): void {
    this.snapshot = {
      ...INITIAL,
      autoPlay: this.snapshot.autoPlay,
      rejectToken: this.snapshot.rejectToken,
    };
    this.emit();
  }

  returnToAssemble(): void {
    this.patch({ phase: 'assemble', frames: [], frameIndex: 0, testEdgeIndex: -1 });
  }

  private patch(partial: Partial<AssemblySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
