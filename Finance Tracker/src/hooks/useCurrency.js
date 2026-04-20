import { formatCurrency } from '../utils/currencyFormatter';

export const useCurrency = () => {
  return {
    format: (amount, code = 'INR') => formatCurrency(amount, code)
  };
};
