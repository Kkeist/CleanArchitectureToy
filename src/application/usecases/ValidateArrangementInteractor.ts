import {
  arrangementSequence,
  isArrangementComplete,
  matchesCorrectOrder,
} from '../../domain/entities/Arrangement';
import type { ArrangementInputData } from '../dto/ArrangementDtos';
import type { CorrectOrderGateway } from '../ports/CorrectOrderGateway';
import type {
  ValidateArrangementInputBoundary,
  ValidateArrangementOutputBoundary,
} from '../ports/ValidateArrangementPorts';

/**
 * Use Case 1: reads the player's arrangement, loads the correct order from
 * data access, compares via the Arrangement entity rules, and pushes the
 * result through the output boundary.
 */
export class ValidateArrangementInteractor
  implements ValidateArrangementInputBoundary
{
  private readonly gateway: CorrectOrderGateway;
  private readonly output: ValidateArrangementOutputBoundary;

  constructor(
    gateway: CorrectOrderGateway,
    output: ValidateArrangementOutputBoundary,
  ) {
    this.gateway = gateway;
    this.output = output;
  }

  execute(input: ArrangementInputData): void {
    const slots = this.gateway.getBoardSlots();
    const submitted = arrangementSequence(input.arrangement, slots);

    if (!isArrangementComplete(input.arrangement, slots)) {
      this.output.present({ result: { ok: false, reason: 'incomplete' }, submitted });
      return;
    }

    const correct = this.gateway.getCorrectOrder();
    const ok = matchesCorrectOrder(input.arrangement, correct, slots);

    this.output.present({
      result: ok ? { ok: true } : { ok: false, reason: 'mismatch' },
      submitted,
    });
  }
}
