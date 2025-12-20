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

interface AuthState {
  user: User | null
  session: Session | null
  profile: ProfilePF | null
  loading: boolean
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  })

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
    if (authState.user) {
      const data = await fetchProfile(authState.user.id)
      setAuthState(prev => ({ ...prev, profile: data }))
    }
  }, [authState.user, fetchProfile])

  useEffect(() => {
    let isMounted = true

    // Initialize auth state
    const init = async () => {
      try {
        // Get session from cookies
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        // No session - user is not logged in
        if (!session?.user) {
          setAuthState(prev => ({ ...prev, loading: false }))
          return
        }

        // Set user immediately in single state update
        setAuthState(prev => ({
          ...prev,
          user: session.user,
          session: session,
          loading: false,
        }))

        // Fetch profile in background
        fetchProfile(session.user.id).then(profileData => {
          if (isMounted && profileData) {
            setAuthState(prev => ({ ...prev, profile: profileData }))
          }
        })

        // Verify session validity in background (don't block UI)
        supabase.auth.getUser().then(({ error }) => {
          if (error && isMounted) {
            // Session is invalid - clear state locally
            setAuthState({ user: null, session: null, profile: null, loading: false })
          }
        }).catch(() => {
          // Ignore network errors during verification
        })
      } catch (error) {
        console.error('[Auth] Init error:', error)
        if (isMounted) {
          setAuthState(prev => ({ ...prev, loading: false }))
        }
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        if (session?.user) {
          // Set user immediately in single state update
          setAuthState(prev => ({
            ...prev,
            user: session.user,
            session: session,
            loading: false,
          }))

          // Fetch profile in background
          fetchProfile(session.user.id).then(profileData => {
            if (isMounted && profileData) {
              setAuthState(prev => ({ ...prev, profile: profileData }))
            }
          })
        } else {
          // Clear all state in single update
          setAuthState({ user: null, session: null, profile: null, loading: false })
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) return { error }

    // Don't update state here - let the redirect happen first
    // The new page will initialize auth state from session cookie
    // This prevents the header from flashing before redirect
    return { error: null }
  }

  const signOut = async () => {
    setAuthState({ user: null, session: null, profile: null, loading: false })
    await supabase.auth.signOut({ scope: 'local' })
  }

  const isAdmin = authState.profile?.role === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        session: authState.session,
        profile: authState.profile,
        loading: authState.loading,
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
