'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingRole(false)
        return
      }

      // Check if user has admin role
      const { data } = await supabase
        .from('profiles_pf')
        .select('role')
        .eq('id', user.id)
        .single()

      if (data?.role === 'ADMIN') {
        setIsAdmin(true)
      } else {
        router.push('/')
      }
      setCheckingRole(false)
    }

    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        checkAdminRole()
      }
    }
  }, [user, authLoading, router, supabase])

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
