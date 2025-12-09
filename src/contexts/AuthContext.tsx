'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { ProfilePF, UserRole } from '@/types/database'

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
  phone?: string
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
    // Use upsert to avoid duplicate key errors if profile is being created simultaneously
    const { data, error } = await supabase
      .from('profiles_pf')
      .upsert({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || '',
        cpf: authUser.user_metadata?.cpf || null,
        phone: authUser.user_metadata?.phone || null,
        role: 'USER',
        created_at: now,
        updated_at: now,
      }, {
        onConflict: 'id',
        ignoreDuplicates: true
      })
      .select()
      .single()

    if (error) {
      // If error is duplicate key, try to fetch the existing profile
      if (error.code === '23505') {
        const { data: existingProfile } = await supabase
          .from('profiles_pf')
          .select('*')
          .eq('id', authUser.id)
          .single()
        return existingProfile as ProfilePF | null
      }
      console.error('Error creating missing profile:', error)
      return null
    }

    return data as ProfilePF
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
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id, session.user)
          setProfile(profileData)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id, session.user)
          setProfile(profileData)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

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
            phone: userData.phone || null,
          },
        },
      })

      if (error) {
        return { error }
      }

      // If user was created successfully, create the profile manually
      // This replaces the database trigger which was causing 500 errors
      // Use upsert to avoid race condition with onAuthStateChange
      if (data.user) {
        const now = new Date().toISOString()
        const { error: profileError } = await supabase
          .from('profiles_pf')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: userData.full_name,
            cpf: userData.cpf || '',
            phone: userData.phone || null,
            role: 'USER',
            created_at: now,
            updated_at: now,
          }, {
            onConflict: 'id',
            ignoreDuplicates: true
          })

        if (profileError && profileError.code !== '23505') {
          console.error('Error creating profile:', profileError)
          // Don't return error here - the user is already created in auth
          // The profile can be created later or admin can fix it
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
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      // Always clear local state even if API call fails
      setUser(null)
      setSession(null)
      setProfile(null)
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
