import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../services/firebase';
import gsap from 'gsap';
import './AuthPage.css';

export default function AuthPage({ isSignup = false }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(isSignup ? 'signup' : 'login');
  
  const { login, signup, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Automatically redirect if already logged in (catches successful redirects)
  useEffect(() => {
    if (currentUser) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  // Handle Redirect Result (Fixes WhatsApp/Instagram WebView issue)
  useEffect(() => {
    setLoading(true);
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          navigate('/app/dashboard', { replace: true });
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to sign in with Google.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  // Sync mode with route changes & reset step
  useEffect(() => {
    setMode(isSignup ? 'signup' : 'login');
    setStep(1);
    setError('');
    setPassword('');
  }, [isSignup]);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(cardRef.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [mode, loading]);

  // Focus password input when moving to step 2
  useEffect(() => {
    if (step === 2 && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [step]);

  const handleOAuth = async (provider) => {
    setError('');
    setLoading(true);
    try {
      if (provider === 'google') await loginWithGoogle();
      // Code won't reach here for redirect method because page unloads
    } catch (err) {
      console.error(err);
      setError(`Failed to sign in with ${provider}.`);
      setLoading(false);
    }
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!email) {
      return setError('Please enter your email address.');
    }
    // Very basic email validation
    if (!email.includes('@')) {
      return setError('Please enter a valid email address.');
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      return setError('Please enter your password.');
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/app/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Try signing up instead.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email. Please log in.');
      } else {
        setError('Failed to authenticate. Check your credentials.');
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setStep(1);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card" ref={cardRef}>
        <div className="auth-header">
          <h1 className="auth-title">
            {mode === 'login' ? 'Log in' : 'Create an account'}
          </h1>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={step === 1 ? handleContinue : handleSubmit}>
          
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || step === 2}
              required 
            />
          </div>

          {step === 2 && (
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                className="form-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                ref={passwordInputRef}
                required 
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? 'Processing...' : (step === 1 ? 'Continue' : (mode === 'login' ? 'Log In' : 'Create Account'))}
          </button>
        </form>

        {step === 1 && (
          <>
            <div className="auth-divider">or</div>

            <div className="auth-oauth">
              <button 
                type="button" 
                className="oauth-btn" 
                onClick={() => handleOAuth('google')}
                disabled={loading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="auth-footer" style={{ marginTop: '16px' }}>
            <span className="auth-link" onClick={() => setStep(1)} style={{ marginLeft: 0, fontWeight: 400 }}>
              &larr; Use a different email
            </span>
          </div>
        )}

        {step === 1 && (
          <div className="auth-footer">
            {mode === 'login' 
              ? "Don't have an account?" 
              : "Already have an account?"}
            <span className="auth-link" onClick={toggleMode}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
