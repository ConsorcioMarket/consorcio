'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Users, Search, Filter, Check, X, AlertCircle, Building2, User, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { formatCPF, formatCNPJ } from '@/lib/utils'
import type { PFStatus, PJStatus } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface UserPF {
  id: string
  email: string
  full_name: string
  cpf: string | null
  phone: string
  status: PFStatus
  created_at: string
  cotas_count: number
  proposals_count: number
}

interface UserPJ {
  id: string
  pf_id: string
  legal_name: string
  cnpj: string
  company_email: string | null
  status: PJStatus
  created_at: string
  owner_name: string
  owner_email: string
}

function getPFStatusBadgeVariant(status: PFStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<PFStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    INCOMPLETE: 'secondary',
    PENDING_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
  }
  return variants[status] || 'outline'
}

function getPJStatusBadgeVariant(status: PJStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<PJStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    INCOMPLETE: 'secondary',
    PENDING_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
  }
  return variants[status] || 'outline'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INCOMPLETE: 'Incompleto',
    PENDING_REVIEW: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
  }
  return labels[status] || status
}

const PAGE_SIZE = 10

export default function AdminUsuariosPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'pf' | 'pj'>('pf')

  // PF state
  const [usersPF, setUsersPF] = useState<UserPF[]>([])
  const [loadingPF, setLoadingPF] = useState(true)
  const [searchTermPF, setSearchTermPF] = useState('')
  const [statusFilterPF, setStatusFilterPF] = useState('all')
  const [pagePF, setPagePF] = useState(1)
  const [totalCountPF, setTotalCountPF] = useState(0)

  // PJ state
  const [usersPJ, setUsersPJ] = useState<UserPJ[]>([])
  const [loadingPJ, setLoadingPJ] = useState(true)
  const [searchTermPJ, setSearchTermPJ] = useState('')
  const [statusFilterPJ, setStatusFilterPJ] = useState('all')
  const [pagePJ, setPagePJ] = useState(1)
  const [totalCountPJ, setTotalCountPJ] = useState(0)

  // Action dialog states
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'approve' | 'reject' | null
    entityType: 'pf' | 'pj'
    entity: UserPF | UserPJ | null
  }>({ open: false, type: null, entityType: 'pf', entity: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Request ID refs to prevent race conditions
  const requestIdPFRef = useRef(0)
  const requestIdPJRef = useRef(0)

  // Fetch PF users
  const fetchUsersPF = useCallback(async () => {
    const currentRequestId = ++requestIdPFRef.current
    setLoadingPF(true)

    let query = supabase
      .from('profiles_pf')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilterPF !== 'all') {
      query = query.eq('status', statusFilterPF as PFStatus)
    }

    if (searchTermPF) {
      query = query.or(`full_name.ilike.%${searchTermPF}%,email.ilike.%${searchTermPF}%,cpf.ilike.%${searchTermPF}%`)
    }

    const from = (pagePF - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    // Ignore stale responses
    if (currentRequestId !== requestIdPFRef.current) return

    if (error) {
      console.error('Error fetching PF users:', error)
      setLoadingPF(false)
      return
    }

    // Fetch counts for all users in parallel
    const usersWithCounts: UserPF[] = await Promise.all(
      (data || []).map(async (user) => {
        const [cotasRes, proposalsRes] = await Promise.all([
          supabase.from('cotas').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
          supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('buyer_pf_id', user.id),
        ])

        return {
          ...user,
          cotas_count: cotasRes.count || 0,
          proposals_count: proposalsRes.count || 0,
        }
      })
    )

    // Ignore stale responses
    if (currentRequestId !== requestIdPFRef.current) return

    setUsersPF(usersWithCounts)
    setTotalCountPF(count || 0)
    setLoadingPF(false)
  }, [supabase, pagePF, statusFilterPF, searchTermPF])

  // Fetch PJ users
  const fetchUsersPJ = useCallback(async () => {
    const currentRequestId = ++requestIdPJRef.current
    setLoadingPJ(true)

    let query = supabase
      .from('profiles_pj')
      .select(`
        id,
        pf_id,
        legal_name,
        cnpj,
        company_email,
        status,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilterPJ !== 'all') {
      query = query.eq('status', statusFilterPJ as PJStatus)
    }

    if (searchTermPJ) {
      query = query.or(`legal_name.ilike.%${searchTermPJ}%,cnpj.ilike.%${searchTermPJ}%,company_email.ilike.%${searchTermPJ}%`)
    }

    const from = (pagePJ - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    // Ignore stale responses
    if (currentRequestId !== requestIdPJRef.current) return

    if (error) {
      console.error('Error fetching PJ users:', error)
      setLoadingPJ(false)
      return
    }

    // Fetch owner info for all PJs in parallel
    const pjsWithOwners: UserPJ[] = await Promise.all(
      (data || []).map(async (pj) => {
        const { data: owner } = await supabase
          .from('profiles_pf')
          .select('full_name, email')
          .eq('id', pj.pf_id)
          .single()

        return {
          ...pj,
          owner_name: owner?.full_name || 'Desconhecido',
          owner_email: owner?.email || '',
        }
      })
    )

    // Ignore stale responses
    if (currentRequestId !== requestIdPJRef.current) return

    setUsersPJ(pjsWithOwners)
    setTotalCountPJ(count || 0)
    setLoadingPJ(false)
  }, [supabase, pagePJ, statusFilterPJ, searchTermPJ])

  useEffect(() => {
    if (activeTab === 'pf') {
      fetchUsersPF()
    }
  }, [activeTab, fetchUsersPF])

  useEffect(() => {
    if (activeTab === 'pj') {
      fetchUsersPJ()
    }
  }, [activeTab, fetchUsersPJ])

  // Realtime subscription for profiles_pf changes
  useEffect(() => {
    const channel = supabase
      .channel('profiles_pf_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles_pf' },
        () => {
          // Refetch when any change happens
          if (activeTab === 'pf') {
            fetchUsersPF()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, activeTab, fetchUsersPF])

  // Realtime subscription for profiles_pj changes
  useEffect(() => {
    const channel = supabase
      .channel('profiles_pj_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles_pj' },
        () => {
          // Refetch when any change happens
          if (activeTab === 'pj') {
            fetchUsersPJ()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, activeTab, fetchUsersPJ])

  const handleAction = async () => {
    if (!actionDialog.entity || !actionDialog.type) return

    setActionLoading(true)

    try {
      const newStatus = actionDialog.type === 'approve' ? 'APPROVED' : 'REJECTED'

      if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
        addToast({
          title: 'Campo obrigatório',
          description: 'Por favor, informe o motivo da rejeição.',
          variant: 'warning',
        })
        setActionLoading(false)
        return
      }

      const table = actionDialog.entityType === 'pf' ? 'profiles_pf' : 'profiles_pj'

      const { error } = await supabase
        .from(table)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actionDialog.entity.id)

      if (error) throw error

      // Refresh appropriate list
      if (actionDialog.entityType === 'pf') {
        await fetchUsersPF()
      } else {
        await fetchUsersPJ()
      }

      addToast({
        title: actionDialog.type === 'approve' ? 'Aprovado!' : 'Rejeitado',
        description: `${actionDialog.entityType === 'pf' ? 'Usuário' : 'Empresa'} ${actionDialog.type === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso.`,
        variant: 'success',
      })

      setActionDialog({ open: false, type: null, entityType: 'pf', entity: null })
      setRejectionReason('')
    } catch (error) {
      console.error('Error updating user:', error)
      addToast({
        title: 'Erro',
        description: 'Erro ao atualizar usuário. Tente novamente.',
        variant: 'error',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const totalPagesPF = Math.ceil(totalCountPF / PAGE_SIZE)
  const totalPagesPJ = Math.ceil(totalCountPJ / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-muted-foreground">Gerenciar usuários e empresas cadastradas</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pf' | 'pj')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pf" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Pessoa Física ({totalCountPF})
          </TabsTrigger>
          <TabsTrigger value="pj" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Pessoa Jurídica ({totalCountPJ})
          </TabsTrigger>
        </TabsList>

        {/* PF Tab */}
        <TabsContent value="pf" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome, email ou CPF..."
                    value={searchTermPF}
                    onChange={(e) => {
                      setSearchTermPF(e.target.value)
                      setPagePF(1)
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={statusFilterPF}
                    onChange={(e) => {
                      setStatusFilterPF(e.target.value)
                      setPagePF(1)
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">Todos os status</option>
                    <option value="INCOMPLETE">Incompleto</option>
                    <option value="PENDING_REVIEW">Pendente</option>
                    <option value="APPROVED">Aprovado</option>
                    <option value="REJECTED">Rejeitado</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-5 w-5" />
                Pessoas Físicas ({totalCountPF})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {loadingPF ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando usuários...</p>
                </div>
              ) : usersPF.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="sm:hidden divide-y">
                    {usersPF.map((user) => (
                      <div key={user.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <Badge variant={getPFStatusBadgeVariant(user.status)} className="shrink-0">
                            {getStatusLabel(user.status)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {user.cpf && <span>CPF: {formatCPF(user.cpf)}</span>}
                          <span>Cotas: {user.cotas_count}</span>
                          <span>Propostas: {user.proposals_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-2">
                            <Link href={`/admin/usuarios/${user.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            {user.status === 'PENDING_REVIEW' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => setActionDialog({ open: true, type: 'approve', entityType: 'pf', entity: user })}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setActionDialog({ open: true, type: 'reject', entityType: 'pf', entity: user })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Nome</th>
                          <th className="text-left p-3 font-medium">CPF</th>
                          <th className="text-center p-3 font-medium">Cotas</th>
                          <th className="text-center p-3 font-medium">Propostas</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-center p-3 font-medium">Cadastro</th>
                          <th className="text-center p-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersPF.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium">{user.full_name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </td>
                            <td className="p-3">
                              {user.cpf ? formatCPF(user.cpf) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline">{user.cotas_count}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline">{user.proposals_count}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={getPFStatusBadgeVariant(user.status)}>
                                {getStatusLabel(user.status)}
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-2">
                                <Link href={`/admin/usuarios/${user.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver
                                  </Button>
                                </Link>
                                {user.status === 'PENDING_REVIEW' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => setActionDialog({ open: true, type: 'approve', entityType: 'pf', entity: user })}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => setActionDialog({ open: true, type: 'reject', entityType: 'pf', entity: user })}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPagesPF > 1 && (
                <Pagination
                  currentPage={pagePF}
                  totalPages={totalPagesPF}
                  onPageChange={setPagePF}
                  className="mt-4 pt-4 border-t px-4 sm:px-0"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PJ Tab */}
        <TabsContent value="pj" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por razão social, CNPJ ou email..."
                    value={searchTermPJ}
                    onChange={(e) => {
                      setSearchTermPJ(e.target.value)
                      setPagePJ(1)
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={statusFilterPJ}
                    onChange={(e) => {
                      setStatusFilterPJ(e.target.value)
                      setPagePJ(1)
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">Todos os status</option>
                    <option value="INCOMPLETE">Incompleto</option>
                    <option value="PENDING_REVIEW">Pendente</option>
                    <option value="APPROVED">Aprovado</option>
                    <option value="REJECTED">Rejeitado</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Companies List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-5 w-5" />
                Pessoas Jurídicas ({totalCountPJ})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {loadingPJ ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando empresas...</p>
                </div>
              ) : usersPJ.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma empresa encontrada.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="sm:hidden divide-y">
                    {usersPJ.map((pj) => (
                      <div key={pj.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{pj.legal_name}</p>
                            <p className="text-xs text-muted-foreground">{formatCNPJ(pj.cnpj)}</p>
                          </div>
                          <Badge variant={getPJStatusBadgeVariant(pj.status)} className="shrink-0">
                            {getStatusLabel(pj.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>Responsável: {pj.owner_name}</p>
                          <p>{pj.owner_email}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(pj.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-2">
                            <Link href={`/admin/usuarios/${pj.pf_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            {pj.status === 'PENDING_REVIEW' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => setActionDialog({ open: true, type: 'approve', entityType: 'pj', entity: pj })}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setActionDialog({ open: true, type: 'reject', entityType: 'pj', entity: pj })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Razão Social</th>
                          <th className="text-left p-3 font-medium">CNPJ</th>
                          <th className="text-left p-3 font-medium">Responsável</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-center p-3 font-medium">Cadastro</th>
                          <th className="text-center p-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersPJ.map((pj) => (
                          <tr key={pj.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium">{pj.legal_name}</div>
                              {pj.company_email && (
                                <div className="text-xs text-muted-foreground">{pj.company_email}</div>
                              )}
                            </td>
                            <td className="p-3">
                              {formatCNPJ(pj.cnpj)}
                            </td>
                            <td className="p-3">
                              <div className="font-medium">{pj.owner_name}</div>
                              <div className="text-xs text-muted-foreground">{pj.owner_email}</div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={getPJStatusBadgeVariant(pj.status)}>
                                {getStatusLabel(pj.status)}
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-muted-foreground">
                              {new Date(pj.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-2">
                                <Link href={`/admin/usuarios/${pj.pf_id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver
                                  </Button>
                                </Link>
                                {pj.status === 'PENDING_REVIEW' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => setActionDialog({ open: true, type: 'approve', entityType: 'pj', entity: pj })}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => setActionDialog({ open: true, type: 'reject', entityType: 'pj', entity: pj })}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPagesPJ > 1 && (
                <Pagination
                  currentPage={pagePJ}
                  totalPages={totalPagesPJ}
                  onPageChange={setPagePJ}
                  className="mt-4 pt-4 border-t px-4 sm:px-0"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, type: null, entityType: 'pf', entity: null })
          setRejectionReason('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'approve' ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {actionDialog.type === 'approve' ? 'Aprovar' : 'Rejeitar'}{' '}
              {actionDialog.entityType === 'pf' ? 'Usuário' : 'Empresa'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' ? (
                <>
                  Você está prestes a aprovar{' '}
                  <strong>
                    {actionDialog.entityType === 'pf'
                      ? (actionDialog.entity as UserPF)?.full_name
                      : (actionDialog.entity as UserPJ)?.legal_name}
                  </strong>.
                </>
              ) : (
                <>
                  Você está prestes a rejeitar{' '}
                  <strong>
                    {actionDialog.entityType === 'pf'
                      ? (actionDialog.entity as UserPF)?.full_name
                      : (actionDialog.entity as UserPJ)?.legal_name}
                  </strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da rejeição *</label>
              <Textarea
                placeholder="Informe o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, type: null, entityType: 'pf', entity: null })
                setRejectionReason('')
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant={actionDialog.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
