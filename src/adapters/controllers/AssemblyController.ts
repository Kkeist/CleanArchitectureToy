import type { Arrangement } from '../../domain/entities/Arrangement';
import type { ValidateArrangementInputBoundary } from '../../application/ports/ValidateArrangementPorts';
import type { PlayAnimationInputBoundary } from '../../application/ports/PlayAnimationPorts';

/**
 * Converts UI events into input data and starts the matching use case.
 */
export class AssemblyController {
  private readonly validate: ValidateArrangementInputBoundary;
  private readonly playAnimation: PlayAnimationInputBoundary;

  constructor(
    validate: ValidateArrangementInputBoundary,
    playAnimation: PlayAnimationInputBoundary,
  ) {
    this.validate = validate;
    this.playAnimation = playAnimation;
  }

  submitArrangement(arrangement: Arrangement): void {
    this.validate.execute({ arrangement });
  }

  startAnimation(): void {
    this.playAnimation.execute();
  }
}
