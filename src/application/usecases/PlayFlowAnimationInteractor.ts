import type { AnimationFrame } from '../ports/PlayAnimationPorts';
import type {
  PlayAnimationInputBoundary,
  PlayAnimationOutputBoundary,
} from '../ports/PlayAnimationPorts';

const BASE: Readonly<Record<string, string>> = {
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

/**
 * Builds the walkthrough as alternating process-arrow beats and focus-box beats.
 * After an arrow (or when a call lands), the next beat is the action art —
 * never a redundant idle frame that is already on screen.
 * After each part finishes it returns to the idle icon, except View which
 * stays on the final result art.
 */
function buildFlowFrames(): AnimationFrame[] {
  let images: Record<string, string> = { ...BASE };
  const frames: AnimationFrame[] = [];

  const box = (focus: string, patch: Readonly<Record<string, string>> = {}) => {
    images = { ...images, ...patch };
    frames.push({ focus, edge: null, images: { ...images } });
  };

  const arrow = (edge: number) => {
    frames.push({ focus: null, edge, images: { ...images } });
  };

  /** Snap one part back to its idle icon and show the box on it. */
  const reset = (focus: keyof typeof BASE) => {
    box(focus, { [focus]: BASE[focus] });
  };

  arrow(0); // View → Controller (View idle already on screen)
  box('con', { con: 'con2.PNG' });
  box('con', { con: 'con3.PNG' });
  reset('con');
  arrow(1); // Controller → Input Boundary
  box('inputb', { inputb: 'inputb2.PNG' });
  box('inputb', { inputb: 'inputb3.PNG' });
  reset('inputb');
  arrow(2); // Input Boundary → UC
  box('uc', { uc: 'ucinter-in.PNG' }); // UC picks up (idle already on screen)
  // Called party jumps straight to the call pose.
  box('da', { da: 'da-uccall.PNG' });
  box('dainter', { dainter: 'da-dainter.PNG' });
  reset('dainter');
  // Hang up before DA leaves the phone for Database work.
  box('da', { da: 'da.PNG' });
  box('da', { uc: 'uc.PNG' });
  arrow(5); // Data Access → Database
  box('db', { db: 'da-db.PNG' });
  reset('db');
  // DA calls UC back with the result — UC answers on the next beat.
  box('da', { da: 'da-ucinter.PNG' });
  box('uc', { uc: 'ucinter-in.PNG' });
  // Hang up: both return idle in one beat (no extra DA box).
  box('da', { da: 'da.PNG', uc: 'uc.PNG' });
  // UC jumps to Entity — new call; no ring arrow.
  box('uc', { uc: 'ucinter-in.PNG' });
  box('entity', { entity: 'entity1.PNG' });
  box('entity', { entity: 'entity2.PNG' });
  box('entity', { entity: 'entity.PNG' }); // entity done
  box('entity', { uc: 'uc.PNG' }); // UC hangs up
  // UC → Output: call, Output answers, UC recovers, then Output animation.
  box('uc', { uc: 'ucinter-out.PNG' });
  box('output', { output: 'output1.PNG' });
  box('uc', { uc: 'uc.PNG' }); // UC recovers before Output animation
  box('output', { output: 'output2.PNG' });
  box('output', { output: 'output3.PNG' });
  reset('output');
  arrow(8); // Output → Presenter
  box('present', { present: 'present-call.PNG' });
  reset('present');
  arrow(9); // Presenter → View
  box('view', { view: 'viewinput.PNG' });
  box('view', { view: 'viewoutend.PNG' });
  // View stays on the final art — no reset.

  return frames;
}

export const FLOW_FRAMES: readonly AnimationFrame[] = buildFlowFrames();

/**
 * Use Case 2: after a correct arrangement, emits the ordered control-flow
 * animation frames for the presenter / view to play.
 */
export class PlayFlowAnimationInteractor implements PlayAnimationInputBoundary {
  private readonly output: PlayAnimationOutputBoundary;

  constructor(output: PlayAnimationOutputBoundary) {
    this.output = output;
  }

  execute(): void {
    this.output.present({ frames: FLOW_FRAMES });
  }
}
