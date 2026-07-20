import type { ValidationOutputData } from '../../application/dto/ArrangementDtos';
import type { AnimationOutputData } from '../../application/ports/PlayAnimationPorts';
import type { ValidateArrangementOutputBoundary } from '../../application/ports/ValidateArrangementPorts';
import type { PlayAnimationOutputBoundary } from '../../application/ports/PlayAnimationPorts';
import type { AssemblyViewModel } from '../../frameworks/ui/AssemblyViewModel';

/**
 * Maps use-case output data into ViewModel updates the View already subscribes to.
 */
export function createAssemblyPresenter(vm: AssemblyViewModel): {
  validation: ValidateArrangementOutputBoundary;
  animation: PlayAnimationOutputBoundary;
} {
  return {
    validation: {
      present(output: ValidationOutputData) {
        if (output.result.ok) {
          vm.setValidationSuccess();
        } else {
          vm.setValidationFailure(output.result.reason);
        }
      },
    },
    animation: {
      present(output: AnimationOutputData) {
        vm.setAnimationFrames(output.frames);
      },
    },
  };
}
