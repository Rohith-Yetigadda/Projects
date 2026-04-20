import { Outlet, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { FinanceProvider } from './context/FinanceContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <FinanceProvider>
      <div className="main-layout">
        <Navigation />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </FinanceProvider>
  );
}

export default App;
