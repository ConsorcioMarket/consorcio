'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Eye, Search, Filter, ChevronLeft, ChevronRight, Check, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, getProposalStatusLabel } from '@/lib/utils'
import type { ProposalStatus, BuyerType } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface ProposalWithRelations {
  id: string
  cota_id: string
  buyer_pf_id: string
  buyer_type: BuyerType
  buyer_entity_id: string
  group_id: string | null
  status: ProposalStatus
  rejection_reason: string | null
  transfer_fee: number | null
  created_at: string
  cota: {
    id: string
    administrator: string
    credit_amount: number
    status: string
  }
  buyer: {
    id: string
    full_name: string
    email: string
  }
}

function getStatusBadgeVariant(status: ProposalStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<ProposalStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    UNDER_REVIEW: 'warning',
    PRE_APPROVED: 'secondary',
    APPROVED: 'success',
    TRANSFER_STARTED: 'default',
    COMPLETED: 'success',
    REJECTED: 'destructive',
  }
  return variants[status] || 'outline'
}

const PAGE_SIZE = 10

export default function AdminPropostasPage() {
  const [proposals, setProposals] = useState<ProposalWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Action dialog states
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'approve' | 'reject' | null
    proposal: ProposalWithRelations | null
  }>({ open: false, type: null, proposal: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const fetchProposals = async () => {
    setLoading(true)

    let query = supabase
      .from('proposals')
      .select(`
        id,
        cota_id,
        buyer_pf_id,
        buyer_type,
        buyer_entity_id,
        group_id,
        status,
        rejection_reason,
        transfer_fee,
        created_at,
        cota:cotas!proposals_cota_id_fkey(id, administrator, credit_amount, status),
        buyer:profiles_pf!proposals_buyer_pf_id_fkey(id, full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as ProposalStatus)
    }

    if (searchTerm) {
      query = query.or(`buyer.full_name.ilike.%${searchTerm}%,cota.administrator.ilike.%${searchTerm}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching proposals:', error)
      setLoading(false)
      return
    }

    const transformedProposals: ProposalWithRelations[] = (data || []).map((proposal) => ({
      ...proposal,
      cota: Array.isArray(proposal.cota) ? proposal.cota[0] : proposal.cota,
      buyer: Array.isArray(proposal.buyer) ? proposal.buyer[0] : proposal.buyer,
    }))

    setProposals(transformedProposals)
    setTotalCount(count || 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchProposals()
  }, [supabase, page, statusFilter, searchTerm])

  const handleAction = async () => {
    if (!actionDialog.proposal || !actionDialog.type) return

    setActionLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const proposal = actionDialog.proposal
      let newStatus: ProposalStatus

      if (actionDialog.type === 'approve') {
        // Move to next status based on current status
        if (proposal.status === 'UNDER_REVIEW') {
          newStatus = 'PRE_APPROVED'
        } else if (proposal.status === 'PRE_APPROVED') {
          newStatus = 'APPROVED'
        } else if (proposal.status === 'APPROVED') {
          newStatus = 'TRANSFER_STARTED'
        } else if (proposal.status === 'TRANSFER_STARTED') {
          newStatus = 'COMPLETED'
        } else {
          throw new Error('Invalid status transition')
        }
      } else {
        newStatus = 'REJECTED'
        if (!rejectionReason.trim()) {
          alert('Por favor, informe o motivo da rejeição.')
          setActionLoading(false)
          return
        }
      }

      // Update proposal status
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'REJECTED') {
        updateData.rejection_reason = rejectionReason
      }

      const { error: updateError } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposal.id)

      if (updateError) throw updateError

      // Create history entry
      await supabase.from('proposal_history').insert({
        proposal_id: proposal.id,
        old_status: proposal.status,
        new_status: newStatus,
        changed_by: user.id,
        notes: newStatus === 'REJECTED' ? rejectionReason : `Status alterado para ${getProposalStatusLabel(newStatus)}`,
      })

      // If approved, reserve the cota
      if (newStatus === 'APPROVED' && proposal.cota?.status === 'AVAILABLE') {
        await supabase
          .from('cotas')
          .update({ status: 'RESERVED', updated_at: new Date().toISOString() })
          .eq('id', proposal.cota_id)
      }

      // If completed, mark cota as sold
      if (newStatus === 'COMPLETED') {
        await supabase
          .from('cotas')
          .update({ status: 'SOLD', updated_at: new Date().toISOString() })
          .eq('id', proposal.cota_id)
      }

      // Refresh list
      await fetchProposals()
      setActionDialog({ open: false, type: null, proposal: null })
      setRejectionReason('')
    } catch (error) {
      console.error('Error updating proposal:', error)
      alert('Erro ao atualizar proposta. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  const getNextActionLabel = (status: ProposalStatus): string => {
    const labels: Record<ProposalStatus, string> = {
      UNDER_REVIEW: 'Pré-Aprovar',
      PRE_APPROVED: 'Aprovar',
      APPROVED: 'Iniciar Transferência',
      TRANSFER_STARTED: 'Concluir',
      COMPLETED: '',
      REJECTED: '',
    }
    return labels[status] || ''
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Propostas</h1>
          <p className="text-muted-foreground">Gerenciar e revisar propostas de compra</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por comprador ou administradora..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os status</option>
                <option value="UNDER_REVIEW">Em Análise</option>
                <option value="PRE_APPROVED">Pré-Aprovada</option>
                <option value="APPROVED">Aprovada</option>
                <option value="TRANSFER_STARTED">Transferência Iniciada</option>
                <option value="COMPLETED">Concluída</option>
                <option value="REJECTED">Rejeitada</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Propostas ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando propostas...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma proposta encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Comprador</th>
                    <th className="text-left p-3 font-medium">Cota</th>
                    <th className="text-right p-3 font-medium">Crédito</th>
                    <th className="text-center p-3 font-medium">Tipo</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Data</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{proposal.buyer?.full_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{proposal.buyer?.email}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{proposal.cota?.administrator || '-'}</div>
                        {proposal.group_id && (
                          <div className="text-xs text-muted-foreground">Grupo: {proposal.group_id.slice(0, 8)}...</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {proposal.cota ? formatCurrency(proposal.cota.credit_amount) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">{proposal.buyer_type}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={getStatusBadgeVariant(proposal.status)}>
                          {getProposalStatusLabel(proposal.status)}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/admin/cotas/${proposal.cota_id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {proposal.status !== 'COMPLETED' && proposal.status !== 'REJECTED' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setActionDialog({ open: true, type: 'approve', proposal })}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setActionDialog({ open: true, type: 'reject', proposal })}
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, totalCount)} de {totalCount} propostas
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-3 text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, type: null, proposal: null })
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
              {actionDialog.type === 'approve' ? getNextActionLabel(actionDialog.proposal?.status || 'UNDER_REVIEW') : 'Rejeitar'} Proposta
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' ? (
                <>
                  Você está prestes a {getNextActionLabel(actionDialog.proposal?.status || 'UNDER_REVIEW').toLowerCase()} a proposta de{' '}
                  <strong>{actionDialog.proposal?.buyer?.full_name}</strong> para a cota{' '}
                  <strong>{actionDialog.proposal?.cota?.administrator}</strong>.
                </>
              ) : (
                <>
                  Você está prestes a rejeitar a proposta de{' '}
                  <strong>{actionDialog.proposal?.buyer?.full_name}</strong>.
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
                setActionDialog({ open: false, type: null, proposal: null })
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
