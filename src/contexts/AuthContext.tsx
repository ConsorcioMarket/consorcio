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

  // Create profile for users who don't have one (legacy users or failed signups)
  const createMissingProfile = useCallback(async (authUser: User) => {
    const now = new Date().toISOString()

    // First, try to insert the profile
    const { error: insertError } = await supabase
      .from('profiles_pf')
      .insert({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || '',
        cpf: authUser.user_metadata?.cpf || null,
        phone: authUser.user_metadata?.phone || '',
        role: 'USER',
        status: 'INCOMPLETE',
        created_at: now,
        updated_at: now,
      })

    // If insert failed (duplicate or other error), just fetch the existing profile
    if (insertError) {
      // Only log if it's not a duplicate key error
      if (insertError.code !== '23505') {
        console.error('Error inserting profile:', insertError)
      }
    }

    // Always fetch the profile after insert attempt
    const { data: profile, error: fetchError } = await supabase
      .from('profiles_pf')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching profile after create:', fetchError)
      return null
    }

    return profile as ProfilePF | null
  }, [supabase])

  const fetchProfile = useCallback(async (userId: string, authUser?: User) => {
    // Use maybeSingle() instead of single() to avoid errors when no row exists
    const { data, error } = await supabase
      .from('profiles_pf')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    // If profile doesn't exist and we have the auth user, create it
    if (!data && authUser) {
      console.log('Profile not found, creating one for user:', userId)
      return await createMissingProfile(authUser)
    }

    return data as ProfilePF | null
  }, [supabase, createMissingProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, user)
      setProfile(profileData)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    // Flag to prevent state updates after unmount
    let isMounted = true

    const initializeAuth = async () => {
      try {
        // Use getUser() instead of getSession() - it validates the session with the server
        // getSession() can return stale/cached data
        // Add timeout to prevent hanging indefinitely
        const getUserPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) => {
          setTimeout(() => resolve({ data: { user: null }, error: new Error('Auth timeout') }), 10000)
        })

        const { data: { user }, error } = await Promise.race([getUserPromise, timeoutPromise])

        // No user is normal for logged-out users - not an error
        if (!user) {
          console.log('Auth init: No user session', error?.message || '')
          if (isMounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (user && isMounted) {
          // Get the session for completeness
          const { data: { session } } = await supabase.auth.getSession()
          setSession(session)
          setUser(user)

          // Fetch profile with timeout to prevent hanging
          try {
            const profilePromise = supabase
              .from('profiles_pf')
              .select('*')
              .eq('id', user.id)
              .maybeSingle()

            const profileTimeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
              setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 3000)
            })

            const { data: profileData } = await Promise.race([profilePromise, profileTimeoutPromise])

            if (isMounted) {
              if (profileData) {
                setProfile(profileData as ProfilePF)
              } else {
                // Create profile if it doesn't exist
                const newProfile = await createMissingProfile(user)
                setProfile(newProfile)
              }
            }
          } catch (err) {
            console.error('Error fetching profile on init:', err)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Fetch profile with a timeout to prevent hanging
          try {
            const profilePromise = supabase
              .from('profiles_pf')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()

            const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
              setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 5000)
            })

            const { data: profileData } = await Promise.race([profilePromise, timeoutPromise])

            if (isMounted) {
              if (profileData) {
                setProfile(profileData as ProfilePF)
              } else if (event === 'SIGNED_IN') {
                // Only create profile on sign in, not on other events
                const newProfile = await createMissingProfile(session.user)
                setProfile(newProfile)
              }
            }
          } catch (err) {
            console.error('Error fetching profile in auth change:', err)
          }
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    try {
      // First, create the auth user
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

      if (error) {
        return { error }
      }

      // If user was created successfully, create the profile manually
      // Profile creation will be handled by createMissingProfile on first login
      // This avoids race conditions and duplicate insert attempts
      if (data.user) {
        // Sign out after registration so user goes to login page cleanly
        // The profile will be created when they log in via createMissingProfile
        try {
          await Promise.race([
            supabase.auth.signOut({ scope: 'local' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('SignOut timeout')), 3000))
          ])
        } catch {
          // Ignore signOut errors - user will be redirected to login anyway
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    // Clear local state first for immediate UI update
    setUser(null)
    setSession(null)
    setProfile(null)

    try {
      // Use scope: 'local' to only clear the local session
      // This is more reliable and avoids issues with global sign out
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.error('Error signing out:', error)
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
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
