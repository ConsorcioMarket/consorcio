'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, FileText, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  totalCotas: number
  pendingDocuments: number
  totalUsers: number
  pendingProposals: number
}

export default function AdminDashboard() {
  const pathname = usePathname()
  const [stats, setStats] = useState<DashboardStats>({
    totalCotas: 0,
    pendingDocuments: 0,
    totalUsers: 0,
    pendingProposals: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)

      // Fetch stats in parallel
      const [cotasRes, docsRes, usersRes, proposalsRes] = await Promise.all([
        supabase.from('cotas').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'UNDER_REVIEW'),
        supabase.from('profiles_pf').select('id', { count: 'exact', head: true }),
        supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'UNDER_REVIEW'),
      ])

      setStats({
        totalCotas: cotasRes.count || 0,
        pendingDocuments: docsRes.count || 0,
        totalUsers: usersRes.count || 0,
        pendingProposals: proposalsRes.count || 0,
      })

      setLoading(false)
    }

    fetchStats()
  }, [pathname])

  const statCards = [
    {
      title: 'Total de Cotas',
      value: stats.totalCotas,
      icon: CreditCard,
      color: 'bg-blue-500',
      href: '/admin/cotas',
    },
    {
      title: 'Documentos Pendentes',
      value: stats.pendingDocuments,
      icon: FileText,
      color: 'bg-yellow-500',
      href: '/admin/documentos',
    },
    {
      title: 'Propostas Pendentes',
      value: stats.pendingProposals,
      icon: Clock,
      color: 'bg-orange-500',
      href: '/admin/propostas',
    },
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-green-500',
      href: '/admin/usuarios',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Painel</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full min-w-[200px]">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className="text-4xl font-bold mt-2">
                        {loading ? '-' : card.value}
                      </p>
                    </div>
                    <div className={`${card.color} p-4 rounded-xl flex-shrink-0`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Ações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.pendingDocuments > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium text-yellow-800">{stats.pendingDocuments} documentos aguardando análise</p>
                  <p className="text-sm text-yellow-700">Revisar documentos enviados por vendedores</p>
                </div>
                <Link href="/admin/documentos">
                  <Button size="sm" variant="outline">Ver</Button>
                </Link>
              </div>
            )}
            {stats.pendingProposals > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <p className="font-medium text-orange-800">{stats.pendingProposals} propostas em análise</p>
                  <p className="text-sm text-orange-700">Propostas aguardando aprovação</p>
                </div>
                <Link href="/admin/propostas">
                  <Button size="sm" variant="outline">Ver</Button>
                </Link>
              </div>
            )}
            {stats.pendingDocuments === 0 && stats.pendingProposals === 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800">Nenhuma ação pendente no momento</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/cotas" className="block">
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Gerenciar Cotas
              </Button>
            </Link>
            <Link href="/admin/documentos" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Revisar Documentos
              </Button>
            </Link>
            <Link href="/admin/usuarios" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Usuários
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
