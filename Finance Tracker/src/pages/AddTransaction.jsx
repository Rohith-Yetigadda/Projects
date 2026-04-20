import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTransactions } from '../hooks/useTransactions';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  amount: yup.number().positive('Must be a positive number').required('Amount is required').typeError('Amount must be a number'),
  category: yup.string().required('Category is required'),
  date: yup.date().required('Date is required').typeError('Please select a valid date'),
  type: yup.string().oneOf(['income', 'expense']).required('Type is required'),
  notes: yup.string(),
  recurring: yup.boolean().default(false)
});

const CATEGORIES = [
  'Food', 'Travel', 'Rent', 'Shopping', 'Entertainment', 'Health', 'Utilities', 'Subscriptions', 'Salary', 'Other'
];

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3
};

const AddTransaction = () => {
  const { addTransaction } = useTransactions();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      type: 'expense',
      date: format(new Date(), 'yyyy-MM-dd'),
      recurring: false
    }
  });

  const transactionType = watch('type');

  const onSubmit = (data) => {
    addTransaction(data);
    toast.success('Transaction added successfully!');
    navigate('/transactions');
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div className="header-actions">
        <h1>Add Transaction</h1>
        <p className="text-secondary">Record a new income or expense</p>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)', maxWidth: '600px' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          
          <div className="form-group" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input type="radio" value="expense" {...register('type')} style={{ width: 'auto' }} /> 
              <span>Expense</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input type="radio" value="income" {...register('type')} style={{ width: 'auto' }} /> 
              <span>Income</span>
            </label>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input type="text" placeholder="e.g. Grocery Run" {...register('title')} />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Amount (₹)</label>
              <input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
              {errors.amount && <p className="form-error">{errors.amount.message}</p>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Date</label>
              <input type="date" {...register('date')} />
              {errors.date && <p className="form-error">{errors.date.message}</p>}
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <select {...register('category')}>
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="form-error">{errors.category.message}</p>}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea placeholder="Optional notes" rows="3" {...register('notes')}></textarea>
          </div>

          {transactionType === 'expense' && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input type="checkbox" id="recurring" {...register('recurring')} style={{ width: 'auto' }} />
              <label htmlFor="recurring" style={{ margin: 0 }}>This is a recurring expense</label>
            </div>
          )}

          <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Transaction</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
export default AddTransaction;
