'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)

  const supabase = createClient()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable
  }, [user, authLoading, router])

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
    <ToastProvider>
      <div className="min-h-screen bg-gray-100">
        <main className="px-4 py-4 sm:py-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
