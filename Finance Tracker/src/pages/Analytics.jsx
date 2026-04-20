import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { useTransactions } from '../hooks/useTransactions';
import { format } from 'date-fns';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: 'var(--space-2)', borderRadius: 'var(--border-radius-md)' }}>
        <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>{label || payload[0].name}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: 0, color: entry.color, fontWeight: 600 }}>
            {entry.name && entry.name !== payload[0].name ? `${entry.name}: ` : ''}₹{entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const { transactions } = useTransactions();

  // Data prep for specific charts
  const { pieData, barData, lineData } = useMemo(() => {
    // Pie: Expenses by Category
    const categoryTotals = {};
    // Bar: Income vs Expense Over overall time
    let totalIncome = 0;
    let totalExpense = 0;
    // Line: Monthly spending trend
    const monthlyDataMap = {};

    transactions.forEach(t => {
      const amt = Number(t.amount);
      const dateObj = new Date(t.date);
      const monthLabel = format(dateObj, 'MMM yy');

      if (!monthlyDataMap[monthLabel]) {
        monthlyDataMap[monthLabel] = { name: monthLabel, income: 0, expense: 0, dateSort: dateObj.getTime() };
      }

      if (t.type === 'expense') {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
        totalExpense += amt;
        monthlyDataMap[monthLabel].expense += amt;
      } else {
        totalIncome += amt;
        monthlyDataMap[monthLabel].income += amt;
      }
    });

    const pieArr = Object.keys(categoryTotals).map(key => ({
      name: key, value: categoryTotals[key]
    })).sort((a,b) => b.value - a.value);

    const barArr = [
      { name: 'Income', value: totalIncome },
      { name: 'Expense', value: totalExpense }
    ];

    const lineArr = Object.values(monthlyDataMap).sort((a,b) => a.dateSort - b.dateSort);

    return { pieData: pieArr, barData: barArr, lineData: lineArr };
  }, [transactions]);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="header-actions" style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Analytics Dashboard</h1>
        <p className="text-secondary">Visual insights into your financial habits</p>
      </div>

      {transactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
          <p>Not enough data to display analytics. Please add transactions first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
            {/* Pie Chart */}
            <div className="card" style={{ height: '400px' }}>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Spending by Category</h3>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="card" style={{ height: '400px' }}>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Income vs Expense</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `₹${val/1000}k`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? 'var(--status-success)' : 'var(--status-danger)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
          <div className="card" style={{ height: '400px' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Monthly Trend</h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36}/>
                <Line type="monotone" dataKey="income" name="Income" stroke="var(--status-success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="var(--status-danger)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </motion.div>
  );
};

export default Analytics;
