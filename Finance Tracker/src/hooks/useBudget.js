import { useContext } from 'react';
import { FinanceContext } from '../context/FinanceContext';

export const useBudget = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useBudget must be used within a FinanceProvider');
  }

  const { transactions, budget, updateBudget } = context;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Calculate total expenses for the current month
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const remainingBudget = budget - totalExpenses;
  const percentageUsed = budget > 0 ? (totalExpenses / budget) * 100 : 0;

  return {
    budget,
    updateBudget,
    totalExpenses,
    remainingBudget,
    percentageUsed
  };
};
