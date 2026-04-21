import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [displayName, setDisplayName] = useState('User')

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setIsAuthLoading(false)
    })
    return unsub
  }, [])

  // Load profile from Firestore when user changes
  useEffect(() => {
    if (!user) return
    const loadProfile = async () => {
      try {
        // Write email/info to the root document so Admin can see it in Firebase Console
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email || 'No email provided',
          lastActive: new Date().toISOString()
        }, { merge: true })

        const snap = await getDoc(doc(db, 'users', user.uid, 'profile', 'info'))
        if (snap.exists()) setDisplayName(snap.data().displayName || 'User')
      } catch { /* silently fail */ }
    }
    loadProfile()
  }, [user])

  const handleSaveName = useCallback(async (name) => {
    setDisplayName(name)
    if (!user) return
    await setDoc(
      doc(db, 'users', user.uid, 'profile', 'info'),
      { displayName: name },
      { merge: true }
    )
  }, [user])

  const handleSignOut = useCallback(() => firebaseSignOut(auth), [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthLoading,
      displayName,
      handleSaveName,
      handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

export default AuthContext
