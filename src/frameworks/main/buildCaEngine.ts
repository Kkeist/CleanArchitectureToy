/**
 * Creates and wires the Clean Architecture engine used by the React View.
 */
import { InMemoryCorrectOrderGateway } from '../../adapters/gateways/InMemoryCorrectOrderGateway';
import { AssemblyController } from '../../adapters/controllers/AssemblyController';
import { createAssemblyPresenter } from '../../adapters/presenters/AssemblyPresenter';
import { ValidateArrangementInteractor } from '../../application/usecases/ValidateArrangementInteractor';
import { PlayFlowAnimationInteractor } from '../../application/usecases/PlayFlowAnimationInteractor';
import { AssemblyViewModel } from '../ui/AssemblyViewModel';

export interface CaEngine {
  viewModel: AssemblyViewModel;
  controller: AssemblyController;
}

export function buildCaEngine(): CaEngine {
  const viewModel = new AssemblyViewModel();
  const gateway = new InMemoryCorrectOrderGateway();
  const presenter = createAssemblyPresenter(viewModel);

  const validate = new ValidateArrangementInteractor(gateway, presenter.validation);
  const playAnimation = new PlayFlowAnimationInteractor(presenter.animation);
  const controller = new AssemblyController(validate, playAnimation);

  return { viewModel, controller };
}
