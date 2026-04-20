import React, { createContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions');
    const savedBudget = localStorage.getItem('budget');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    if (savedBudget) {
      setBudget(JSON.parse(savedBudget));
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('transactions', JSON.stringify(transactions));
      localStorage.setItem('budget', JSON.stringify(budget));
    }
  }, [transactions, budget, isLoaded]);

  const addTransaction = (transaction) => {
    setTransactions((prev) => [
      ...prev,
      { ...transaction, id: uuidv4() }
    ]);
  };

  const updateTransaction = (id, updatedTransaction) => {
    setTransactions((prev) => 
      prev.map(t => t.id === id ? { ...t, ...updatedTransaction } : t)
    );
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter(t => t.id !== id));
  };

  const updateBudget = (newBudget) => {
    setBudget(newBudget);
  };

  return (
    <FinanceContext.Provider value={{
      transactions,
      budget,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      updateBudget
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
