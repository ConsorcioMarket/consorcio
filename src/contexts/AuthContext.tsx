'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { ProfilePF } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: ProfilePF | null
  loading: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, userData: SignUpData) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

interface SignUpData {
  full_name: string
  cpf?: string
  phone: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfilePF | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Fetch profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles_pf')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    return data as ProfilePF | null
  }, [supabase])

  // Create profile if missing (uses upsert to prevent duplicates)
  const createProfile = useCallback(async (authUser: User) => {
    const now = new Date().toISOString()

    // Use upsert with onConflict to prevent duplicate profiles
    await supabase
      .from('profiles_pf')
      .upsert({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || '',
        cpf: authUser.user_metadata?.cpf || null,
        phone: authUser.user_metadata?.phone || '',
        role: 'USER',
        status: 'INCOMPLETE',
        created_at: now,
        updated_at: now,
      }, {
        onConflict: 'id',
        ignoreDuplicates: true, // Don't update if already exists
      })

    return fetchProfile(authUser.id)
  }, [supabase, fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const data = await fetchProfile(user.id)
      setProfile(data)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    let isMounted = true

    // Initialize auth state
    const init = async () => {
      try {
        // Get session from cookies - trust it for immediate UI
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        // No session - user is not logged in
        if (!session?.user) {
          setLoading(false)
          return
        }

        // Fetch profile FIRST before updating user state
        // This prevents UI from showing "Conta" before name loads
        const profileData = await fetchProfile(session.user.id)
        if (!isMounted) return

        setProfile(profileData)
        setUser(session.user)
        setSession(session)
        setLoading(false)

        // Verify session validity in background (don't block UI)
        supabase.auth.getUser().then(({ error }) => {
          if (error && isMounted) {
            // Session is invalid - clear state locally (don't call signOut to avoid 403)
            setUser(null)
            setSession(null)
            setProfile(null)
          }
        }).catch(() => {
          // Ignore network errors during verification
        })
      } catch (error) {
        console.error('[Auth] Init error:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        if (session?.user) {
          // Fetch profile FIRST before updating user state
          // This prevents UI from showing "Conta" before name loads
          const profileData = await fetchProfile(session.user.id)
          if (!isMounted) return

          setProfile(profileData)
          setUser(session.user)
          setSession(session)
          setLoading(false)
        } else {
          setUser(null)
          setSession(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.full_name,
          cpf: userData.cpf || '',
          phone: userData.phone,
        },
      },
    })

    if (error) return { error }

    // Create profile in database (don't update UI state - user must login manually)
    if (data.user) {
      await createProfile(data.user)
      // Sign out immediately so user must login manually
      await supabase.auth.signOut({ scope: 'local' })
    }

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) return { error }

    // Fetch profile FIRST, then update all state together
    // This prevents the UI from showing email before name loads
    if (data.user && data.session) {
      const profileData = await fetchProfile(data.user.id)
      setProfile(profileData)
      setUser(data.user)
      setSession(data.session)
    }

    return { error: null }
  }

  const signOut = async () => {
    setUser(null)
    setSession(null)
    setProfile(null)
    await supabase.auth.signOut({ scope: 'local' })
  }

  const isAdmin = profile?.role === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
