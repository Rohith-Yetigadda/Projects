import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

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

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to="/" className="navbar__brand">
          Dryft <span className="navbar__brand-dot" />
        </Link>
        
        <div className="navbar__links">
          <Link to="#features" className="navbar__link">Features</Link>
          <Link to="#how-it-works" className="navbar__link">How it works</Link>
          <Link to="/pricing" className="navbar__link">Pricing</Link>
        </div>

        <div className="navbar__actions">
          <button className="btn btn-ghost">Sign in</button>
          <button className="btn btn-primary">Get started</button>
        </div>
      </div>
    </nav>
  );
}
