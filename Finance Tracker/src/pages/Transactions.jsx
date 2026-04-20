import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransactions } from '../hooks/useTransactions';
import { useDebounce } from '../hooks/useDebounce';
import TransactionCard from '../components/TransactionCard';
import { toast } from 'react-toastify';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const Transactions = () => {
  const { transactions, deleteTransaction } = useTransactions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // date | amount | category

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
      toast.success('Transaction deleted');
    }
  };

  const handleEdit = () => {
    toast.info('Edit functionality omitted for MVP scope. Add a new transaction to make corrections.', { autoClose: 3000 });
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(lowerSearch) || 
        (t.notes && t.notes.toLowerCase().includes(lowerSearch))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'amount') {
        return b.amount - a.amount;
      } else if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });

    return result;
  }, [transactions, debouncedSearch, filterType, sortBy]);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>Transactions</h1>
          <p className="text-secondary">Manage and filter your spending</p>
        </div>
        
        {/* Filters & Controls */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search by title or notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px' }}
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        {filteredAndSorted.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>
            No transactions found. Adjust your filters or add a new transaction.
          </div>
        ) : (
          <div>
            {filteredAndSorted.map(t => (
              <TransactionCard 
                key={t.id} 
                transaction={t} 
                onDelete={handleDelete} 
                onEdit={handleEdit} 
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Transactions;
