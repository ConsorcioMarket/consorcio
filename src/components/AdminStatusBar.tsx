'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Clock, LayoutDashboard, X, ChevronUp, Users, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

interface AdminStats {
  pendingDocuments: number
  pendingProposals: number
  pendingUsers: number
  totalCotas: number
}

export function AdminStatusBar() {
  const { isAdmin, user } = useAuth()
  const [stats, setStats] = useState<AdminStats>({
    pendingDocuments: 0,
    pendingProposals: 0,
    pendingUsers: 0,
    totalCotas: 0,
  })
  const [minimized, setMinimized] = useState(false)
  const [mounted, setMounted] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch admin stats
  useEffect(() => {
    if (!isAdmin || !user) return

    const fetchStats = async () => {
      const [docsRes, proposalsRes, usersRes, cotasRes] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'UNDER_REVIEW'),
        supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'UNDER_REVIEW'),
        supabase.from('profiles_pf').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_REVIEW'),
        supabase.from('cotas').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        pendingDocuments: docsRes.count || 0,
        pendingProposals: proposalsRes.count || 0,
        pendingUsers: usersRes.count || 0,
        totalCotas: cotasRes.count || 0,
      })
    }

    fetchStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [isAdmin, user, supabase])

  // Don't render if not admin or not mounted (prevents hydration mismatch)
  if (!mounted || !isAdmin) return null

  const totalPending = stats.pendingDocuments + stats.pendingProposals + stats.pendingUsers

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg hover:bg-slate-700 transition-all flex items-center gap-2"
      >
        <LayoutDashboard className="h-4 w-4" />
        <span className="font-medium">Admin</span>
        {totalPending > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {totalPending}
          </span>
        )}
        <ChevronUp className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 text-white shadow-lg border-t border-slate-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left: Admin badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-full">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Modo Admin</span>
            </div>
          </div>

          {/* Center: Stats */}
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <Link
              href="/admin/documentos"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                stats.pendingDocuments > 0
                  ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300'
                  : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{stats.pendingDocuments}</span>
              <span className="hidden md:inline text-sm">Docs</span>
            </Link>

            <Link
              href="/admin/propostas"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                stats.pendingProposals > 0
                  ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300'
                  : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{stats.pendingProposals}</span>
              <span className="hidden md:inline text-sm">Propostas</span>
            </Link>

            <Link
              href="/admin/usuarios"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                stats.pendingUsers > 0
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                  : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{stats.pendingUsers}</span>
              <span className="hidden md:inline text-sm">Usuários</span>
            </Link>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-slate-400">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">{stats.totalCotas} Cotas</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button size="sm" variant="secondary" className="bg-primary hover:bg-primary/90 text-white">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Painel</span>
              </Button>
            </Link>
            <button
              onClick={() => setMinimized(true)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="Minimizar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
