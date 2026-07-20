import type { ArrangementInputData, ValidationOutputData } from '../dto/ArrangementDtos';

/** Input Boundary for validating the assembled CA diagram. */
export interface ValidateArrangementInputBoundary {
  execute(input: ArrangementInputData): void;
}

/** Output Boundary implemented by the presenter after validation. */
export interface ValidateArrangementOutputBoundary {
  present(output: ValidationOutputData): void;
}
