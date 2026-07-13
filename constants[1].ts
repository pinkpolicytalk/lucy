import { InsuranceType } from './types';

export const MULTIPLIERS = {
  [InsuranceType.AUTO]: 6,
  [InsuranceType.FIRE]: 12,
  [InsuranceType.LIFE]: 12,
};

export const TYPE_LABELS = {
  [InsuranceType.AUTO]: 'Auto',
  [InsuranceType.FIRE]: 'Fire',
  [InsuranceType.LIFE]: 'Life',
};

export const CSL_MULTIPLIERS = {
  '1M': 1.722,
  '2M': 2.047,
};

export const DISCOUNT_DATA = {
  'CGDD': 20,
  'MCD': 25,
  'MLD life': 4,
  'MLD renter': 9,
  'MLD home': 21,
  'MLD home & plup': 28
};

export const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
