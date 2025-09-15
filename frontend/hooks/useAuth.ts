import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null)

  const checkProfileComplete = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${userId}/profile`)
      if (response.ok) {
        const data = await response.json()
        setProfileComplete(data.profile?.profile_completed || false)
      } else {
        setProfileComplete(false)
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      setProfileComplete(false)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      setUser(user)

      if (user) {
        await checkProfileComplete(user.id)
      } else {
        setProfileComplete(null)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null
        setUser(user)

        if (user) {
          await checkProfileComplete(user.id)
        } else {
          setProfileComplete(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Auth helper functions
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) {
      await checkProfileComplete(user.id)
    }
  }

  return {
    user,
    loading,
    profileComplete,
    signOut,
    refreshProfile,
  }
}