/**
 * Center notes: assemble guidance, then CSC207 §11.4 process steps in playback.
 * Process step numbers only move forward with the animation (never jump backwards).
 * When a step changes, the new title appears on the process-arrow beat.
 */
export interface ProcessNote {
  title: string;
  body: string;
}

/** Shown while the player is still placing parts. */
export const ASSEMBLE_GUIDE: ProcessNote = {
  title: 'Arrange the process',
  body: 'Put each part on the ring in the correct Clean Architecture process order.',
};

/** Shown when every seat is filled and the player can start the path check. */
export const TEST_PROMPT: ProcessNote = {
  title: 'Ready to test',
  body: 'Click the View to test!',
};

/** Shown while arrows walk the path and check each seat. */
export const TESTING_NOTE: ProcessNote = {
  title: 'Testing',
  body: 'Wrong parts go back to the middle.',
};

const S1: ProcessNote = {
  title: 'Step 1: View -> Controller',
  body: 'The user interacts with the View, triggering an event that contains input from the user that is passed to the Controller.',
};

const S2: ProcessNote = {
  title: 'Step 2: Controller -> Input Boundary',
  body: 'The Controller bundles the input from the user into an Input Data object and passes that through the Input Boundary (i.e., calls a method defined in the Input Boundary interface that takes an Input Data object as a parameter).',
};

const S3: ProcessNote = {
  title: 'Step 3: Use Case Interactor -> Data Access Interface',
  body: 'As part of its work, the Use Case Interactor may need to read data through the data access interface. For example, it may request to get an Entity object given information from the Input Data object that was passed in by the Controller.',
};

const S4: ProcessNote = {
  title: 'Step 4: Data Access -> Database',
  body: 'The Data Access object does what it needs to do to read data from whatever database is used to actually store the data.',
};

const S5: ProcessNote = {
  title: 'Step 5: Use Case Interactor -> Entities',
  body: 'Once the Use Case Interactor has the Entity objects that it needs from the Data Access object, it uses the methods of the Entities to complete its work.',
};

const S6: ProcessNote = {
  title: 'Step 6: Use Case Interactor -> Output Boundary',
  body: 'Once the Use Case Interactor finishes its work, it creates an Output Data object and passes that through the Output Boundary (i.e., calls a method defined in the Output Boundary interface that takes an Output Data object as a parameter).',
};

const S7: ProcessNote = {
  title: 'Step 7: Presenter -> View Model',
  body: 'The last step is for the Presenter to take the information from the Output Data object and update the View Model to reflect the result of the user interaction. The View will be alerted of this change and can update itself accordingly.',
};

export const PROCESS_INTRO: ProcessNote = {
  title: '11.4. Our CA Engine in Action',
  body: 'The following steps trace the flow of control through the Clean Architecture engine.',
};

/**
 * Aligned 1:1 with FLOW_FRAMES.
 * Reset-to-idle box beats keep the same step as the finished work.
 */
export const PROCESS_BY_FRAME: readonly ProcessNote[] = [
  S1, // arrow View→Con
  S1, // con2
  S1, // con3
  S1, // reset con
  S2, // arrow Con→InputB
  S2, // inputb2
  S2, // inputb3
  S2, // reset inputb
  S3, // arrow InputB→UC
  S3, // ucinter-in (UC picks up)
  S3, // da-uccall (DA picks up)
  S3, // da-dainter
  S3, // reset dainter
  S3, // DA hangs up
  S3, // UC hangs up
  S4, // arrow DA→DB
  S4, // da-db
  S4, // reset db
  S4, // da-ucinter (DA calls UC back)
  S4, // UC answers
  S4, // both hang up
  S5, // ucinter-in (UC picks up for Entities)
  S5, // entity1
  S5, // entity2
  S5, // entity done
  S5, // UC hangs up
  S6, // ucinter-out (UC picks up for Output)
  S6, // output1
  S6, // UC recovers to idle
  S6, // output2
  S6, // output3
  S6, // reset output
  S7, // arrow → Present
  S7, // present-call
  S7, // reset present
  S7, // arrow Present→View
  S7, // viewinput
  S7, // viewoutend
];

export function assembleNote(boardFull: boolean): ProcessNote {
  return boardFull ? TEST_PROMPT : ASSEMBLE_GUIDE;
}

export function processNoteForFrame(
  phase: string,
  frameIndex: number,
): ProcessNote {
  if (phase === 'testing') return TESTING_NOTE;
  if (phase !== 'playing' && phase !== 'done') return PROCESS_INTRO;
  return PROCESS_BY_FRAME[frameIndex] ?? PROCESS_INTRO;
}
