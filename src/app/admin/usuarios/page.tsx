'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Users, Search, Filter, ChevronLeft, ChevronRight, Check, X, AlertCircle, Building2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCPF, formatCNPJ } from '@/lib/utils'
import type { PFStatus, PJStatus, UserRole } from '@/types/database'
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
  role: UserRole
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

  // Fetch PF users
  const fetchUsersPF = useCallback(async () => {
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

    if (error) {
      console.error('Error fetching PF users:', error)
      setLoadingPF(false)
      return
    }

    // Fetch counts for each user
    const usersWithCounts: UserPF[] = []
    for (const user of data || []) {
      const [cotasRes, proposalsRes] = await Promise.all([
        supabase.from('cotas').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
        supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('buyer_pf_id', user.id),
      ])

      usersWithCounts.push({
        ...user,
        cotas_count: cotasRes.count || 0,
        proposals_count: proposalsRes.count || 0,
      })
    }

    setUsersPF(usersWithCounts)
    setTotalCountPF(count || 0)
    setLoadingPF(false)
  }, [supabase, pagePF, statusFilterPF, searchTermPF])

  // Fetch PJ users
  const fetchUsersPJ = useCallback(async () => {
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

    if (error) {
      console.error('Error fetching PJ users:', error)
      setLoadingPJ(false)
      return
    }

    // Fetch owner info for each PJ
    const pjsWithOwners: UserPJ[] = []
    for (const pj of data || []) {
      const { data: owner } = await supabase
        .from('profiles_pf')
        .select('full_name, email')
        .eq('id', pj.pf_id)
        .single()

      pjsWithOwners.push({
        ...pj,
        owner_name: owner?.full_name || 'Desconhecido',
        owner_email: owner?.email || '',
      })
    }

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

  const handleAction = async () => {
    if (!actionDialog.entity || !actionDialog.type) return

    setActionLoading(true)

    try {
      const newStatus = actionDialog.type === 'approve' ? 'APPROVED' : 'REJECTED'

      if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
        alert('Por favor, informe o motivo da rejeição.')
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

      setActionDialog({ open: false, type: null, entityType: 'pf', entity: null })
      setRejectionReason('')
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Erro ao atualizar usuário. Tente novamente.')
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

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pessoas Físicas ({totalCountPF})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPF ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando usuários...</p>
                </div>
              ) : usersPF.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Nome</th>
                        <th className="text-left p-3 font-medium">CPF</th>
                        <th className="text-center p-3 font-medium">Cotas</th>
                        <th className="text-center p-3 font-medium">Propostas</th>
                        <th className="text-center p-3 font-medium">Role</th>
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
                            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
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
              )}

              {/* Pagination */}
              {totalPagesPF > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(pagePF - 1) * PAGE_SIZE + 1} a {Math.min(pagePF * PAGE_SIZE, totalCountPF)} de {totalCountPF} usuários
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagePF(pagePF - 1)}
                      disabled={pagePF === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      {pagePF} / {totalPagesPF}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagePF(pagePF + 1)}
                      disabled={pagePF === totalPagesPF}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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

          {/* Companies Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Pessoas Jurídicas ({totalCountPJ})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPJ ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando empresas...</p>
                </div>
              ) : usersPJ.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma empresa encontrada.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
              )}

              {/* Pagination */}
              {totalPagesPJ > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(pagePJ - 1) * PAGE_SIZE + 1} a {Math.min(pagePJ * PAGE_SIZE, totalCountPJ)} de {totalCountPJ} empresas
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagePJ(pagePJ - 1)}
                      disabled={pagePJ === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      {pagePJ} / {totalPagesPJ}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagePJ(pagePJ + 1)}
                      disabled={pagePJ === totalPagesPJ}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
