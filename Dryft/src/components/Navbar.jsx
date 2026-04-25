import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to="/" className="navbar__brand">
          Dryft <span className="navbar__brand-dot" />
        </Link>
        
        <div className="navbar__links">
          <Link to="/#features" className="navbar__link">Features</Link>
          <Link to="/#how-it-works" className="navbar__link">How it works</Link>
          <Link to="/pricing" className="navbar__link">Pricing</Link>
        </div>

        <div className="navbar__actions">
          {currentUser ? (
            <>
              <Link to="/app/dashboard" className="btn btn-ghost">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-primary" style={{ padding: '0 16px' }}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign in</Link>
              <Link to="/signup" className="btn btn-primary">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
