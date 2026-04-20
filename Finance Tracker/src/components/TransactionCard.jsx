import { FiEdit2, FiTrash2, FiRepeat } from 'react-icons/fi';
import { useCurrency } from '../hooks/useCurrency';
import { format } from 'date-fns';

const TransactionCard = ({ transaction, onDelete, onEdit }) => {
  const { format: formatCurr } = useCurrency();
  const isIncome = transaction.type === 'income';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-4)',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-md)',
      marginBottom: 'var(--space-2)',
      transition: 'all var(--transition-fast)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {transaction.title}
          {transaction.recurring && <FiRepeat style={{ color: 'var(--accent-primary)', fontSize: '12px' }} title="Recurring Expense" />}
        </h4>
        <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <span>{transaction.category}</span>
          <span>&bull;</span>
          <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ 
          color: isIncome ? 'var(--status-success)' : 'var(--text-primary)',
          fontWeight: 600,
          fontSize: '1.125rem'
        }}>
          {isIncome ? '+' : '-'}{formatCurr(transaction.amount)}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button className="btn-icon" onClick={() => onEdit(transaction)} title="Edit">
            <FiEdit2 />
          </button>
          <button className="btn-icon" onClick={() => onDelete(transaction.id)} title="Delete" style={{ color: 'var(--status-danger)' }}>
            <FiTrash2 />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionCard;
