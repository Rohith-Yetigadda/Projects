import { NavLink } from 'react-router-dom';
import { FiPieChart, FiList, FiPlusCircle, FiDollarSign, FiBarChart2 } from 'react-icons/fi';
import './Navigation.css';

const Navigation = () => {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>FinanceApp</h2>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            <FiPieChart /> <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/transactions" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <FiList /> <span>Transactions</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/transactions/new" className={({ isActive }) => (isActive ? 'active' : '')}>
            <FiPlusCircle /> <span>Add Transaction</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/budget" className={({ isActive }) => (isActive ? 'active' : '')}>
            <FiDollarSign /> <span>Budget</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
            <FiBarChart2 /> <span>Analytics</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};
export default Navigation;
