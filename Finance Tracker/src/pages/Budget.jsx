import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBudget } from '../hooks/useBudget';
import { useCurrency } from '../hooks/useCurrency';
import { toast } from 'react-toastify';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const Budget = () => {
  const { budget, updateBudget, totalExpenses, remainingBudget, percentageUsed } = useBudget();
  const { format } = useCurrency();
  const [newBudget, setNewBudget] = useState(budget || '');

  const handleSave = (e) => {
    e.preventDefault();
    const val = Number(newBudget);
    if (val >= 0) {
      updateBudget(val);
      toast.success('Budget updated successfully!');
    } else {
      toast.error('Please enter a valid amount');
    }
  };

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="header-actions">
        <h1>Monthly Budget</h1>
        <p className="text-secondary">Set and monitor your spending limit for {currentMonthName}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
        
        {/* Set Budget Form */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Set Your Limit</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Monthly Budget Limit (₹)</label>
              <input 
                type="number" 
                value={newBudget} 
                onChange={(e) => setNewBudget(e.target.value)} 
                placeholder="e.g. 50000"
                step="1000"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Update Budget
            </button>
          </form>
        </div>

        {/* Budget Status Widget */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Status</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <span className="text-secondary">Spent: <b style={{ color: 'var(--text-primary)' }}>{format(totalExpenses)}</b></span>
            <span className="text-secondary">Limit: <b style={{ color: 'var(--text-primary)' }}>{format(budget)}</b></span>
          </div>
          
          <div style={{ height: '12px', background: 'var(--bg-base)', borderRadius: 'var(--border-radius-full)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${Math.min(percentageUsed, 100)}%`,
                background: percentageUsed > 100 ? 'var(--status-danger)' : percentageUsed > 80 ? '#f59e0b' : 'var(--status-success)',
                transition: 'width 1s ease-in-out'
              }} 
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
            {remainingBudget < 0 ? (
              <p style={{ color: 'var(--status-danger)', fontWeight: 600 }}>Over budget by {format(Math.abs(remainingBudget))}!</p>
            ) : (
              <p style={{ color: 'var(--status-success)', fontWeight: 600 }}>{format(remainingBudget)} remaining</p>
            )}
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>{percentageUsed.toFixed(1)}% used</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
export default Budget;
