import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'

function useAuth() {
  const [user, setUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { user, isAuthLoading }
}

export default useAuth
