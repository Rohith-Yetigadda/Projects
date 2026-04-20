import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import AddTransaction from './pages/AddTransaction.jsx';
import Budget from './pages/Budget.jsx';
import Analytics from './pages/Analytics.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "transactions", element: <Transactions /> },
      { path: "transactions/new", element: <AddTransaction /> },
      { path: "budget", element: <Budget /> },
      { path: "analytics", element: <Analytics /> },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
