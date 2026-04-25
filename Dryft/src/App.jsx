import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useLenis } from './hooks/useLenis';
import Navbar from './components/Navbar';
import AmbientAurora from './components/AmbientAurora';
import LandingPage from './pages/LandingPage';

function App() {
  // Initialize Lenis smooth scroll globally
  useLenis();

  return (
    <BrowserRouter>
      {/* Premium Background Layer */}
      <AmbientAurora />

      {/* Global Navigation */}
      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
