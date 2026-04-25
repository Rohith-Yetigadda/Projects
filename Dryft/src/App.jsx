import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useLenis } from './hooks/useLenis';
import Navbar from './components/Navbar';
import AmbientAurora from './components/AmbientAurora';
import LandingPage from './pages/LandingPage';

import { AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

import Dashboard from './pages/Dashboard';

function App() {
  // Initialize Lenis smooth scroll globally
  useLenis();

  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Premium Background Layer */}
        <AmbientAurora />

        {/* Global Navigation */}
        <Navbar />

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage isSignup={false} />} />
          <Route path="/signup" element={<AuthPage isSignup={true} />} />
          <Route path="/app/dashboard" element={<Dashboard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
