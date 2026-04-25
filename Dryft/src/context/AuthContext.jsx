import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Email/Password Sign up
  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // Email/Password Log in
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Google OAuth Log in (Redirect method prevents WebView popup blocking)
  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithRedirect(auth, provider);
  }

  // Apple OAuth Log in
  function loginWithApple() {
    const provider = new OAuthProvider('apple.com');
    return signInWithPopup(auth, provider);
  }

  // Log out function
  function logout() {
    return signOut(auth);
  }

  // Setup observer on auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // NXUS Safety Pattern: Ensure user exists in Firestore database
  useEffect(() => {
    if (!currentUser) return;
    
    const initializeUserProfile = async () => {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          email: currentUser.email || 'No email provided',
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to initialize user profile in Firestore:", err);
      }
    };
    
    initializeUserProfile();
  }, [currentUser]);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    loginWithApple,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
