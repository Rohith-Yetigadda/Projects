import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransactions } from '../hooks/useTransactions';
import { useCurrency } from '../hooks/useCurrency';
import TransactionCard from '../components/TransactionCard';
import { Link } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const Dashboard = () => {
  const { transactions } = useTransactions();
  const { format } = useCurrency();

  const { income, expense, balance, topCategory } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap = {};

    transactions.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        inc += amt;
      } else {
        exp += amt;
        catMap[t.category] = (catMap[t.category] || 0) + amt;
      }
    });

    const topCat = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0] || 'N/A';

    return { income: inc, expense: exp, balance: inc - exp, topCategory: topCat };
  }, [transactions]);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="header-actions">
        <h1>Dashboard</h1>
        <p className="text-secondary">Overview of your financial health</p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 'var(--space-4)', marginTop: 'var(--space-6)'
      }}>
        <div className="card">
          <p className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Net Balance</p>
          <h2 style={{ fontSize: '2rem', marginTop: 'var(--space-2)' }}>{format(balance)}</h2>
        </div>
        <div className="card">
          <p className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Total Income</p>
          <h2 style={{ fontSize: '2rem', marginTop: 'var(--space-2)', color: 'var(--status-success)' }}>{format(income)}</h2>
        </div>
        <div className="card">
          <p className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Total Expenses</p>
          <h2 style={{ fontSize: '2rem', marginTop: 'var(--space-2)', color: 'var(--status-danger)' }}>{format(expense)}</h2>
        </div>
        <div className="card">
          <p className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Top Category</p>
          <h2 style={{ fontSize: '1.5rem', marginTop: 'var(--space-2)', color: 'var(--accent-primary)' }}>{topCategory}</h2>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3>Recent Transactions</h3>
          <Link to="/transactions" className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>View All</Link>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
            <p>No transactions yet.</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Link to="/transactions/new" className="btn btn-primary">Add your first transaction</Link>
            </div>
          </div>
        ) : (
          <div>
            {recentTransactions.map(t => (
              <TransactionCard 
                key={t.id} 
                transaction={t} 
                onDelete={() => {}} 
                onEdit={() => {}} 
              />
            ))}
          </div>
        )}
      </div>

    </motion.div>
  );
};
export default Dashboard;
