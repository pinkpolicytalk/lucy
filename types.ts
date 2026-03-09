export enum InsuranceType {
  AUTO = 'AUTO',
  FIRE = 'FIRE',
  LIFE = 'LIFE'
}

export enum CalculationMode {
  FORWARD = 'FORWARD',
  REVERSE = 'REVERSE'
}

export enum CalculatorTab {
  PREMIUM = 'PREMIUM',
  MILES = 'MILES',
  DISCOUNTS = 'DISCOUNTS',
  DIFFERENCE = 'DIFFERENCE',
  REBUILD = 'REBUILD',
  LIFE = 'LIFE'
}

export enum AppPage {
  QUICK = 'QUICK'
}

export type DiscountState = 'REMOVE' | 'NONE' | 'ADD';

export interface CalculationResult {
  inputAmount: number;
  outputAmount: number;
  type?: InsuranceType;
  mode?: CalculationMode;
  multiplier?: number;
  tab: CalculatorTab;
  details?: any;
}
