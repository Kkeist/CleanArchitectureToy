/**
 * One frame of the CA control-flow walkthrough.
 * Arrow beats and box beats are separate: never both in the same frame.
 * focus = gold box on the part currently animating; edge = process arrow index.
 */
export interface AnimationFrame {
  focus: string | null;
  edge: number | null;
  images: Readonly<Record<string, string>>;
}

export interface AnimationOutputData {
  frames: readonly AnimationFrame[];
}

export interface PlayAnimationInputBoundary {
  execute(): void;
}

export interface PlayAnimationOutputBoundary {
  present(output: AnimationOutputData): void;
}
