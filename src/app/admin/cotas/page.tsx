'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, Eye, FileText, Search, Filter, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, getCotaStatusLabel } from '@/lib/utils'
import type { CotaStatus } from '@/types/database'

interface CotaWithSeller {
  id: string
  administrator: string
  credit_amount: number
  entry_amount: number
  n_installments: number
  status: CotaStatus
  created_at: string
  seller: {
    id: string
    full_name: string
    email: string
  }
  hasStatement: boolean
}

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: CotaStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'RESERVED', label: 'Reservada' },
  { value: 'SOLD', label: 'Vendida' },
  { value: 'REMOVED', label: 'Removida' },
]

export default function AdminCotasPage() {
  const pathname = usePathname()
  const [cotas, setCotas] = useState<CotaWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Status change dialog
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean
    cota: CotaWithSeller | null
    newStatus: CotaStatus | null
  }>({ open: false, cota: null, newStatus: null })
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchCotas = async () => {
      setLoading(true)

      // Build query
      let query = supabase
        .from('cotas')
        .select(`
          id,
          administrator,
          credit_amount,
          entry_amount,
          n_installments,
          status,
          created_at,
          seller:profiles_pf!cotas_seller_id_fkey(id, full_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as CotaStatus)
      }

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('administrator', `%${searchTerm}%`)
      }

      // Apply pagination
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching cotas:', error)
        setLoading(false)
        return
      }

      // Fetch document status for each cota
      const cotaIds = (data || []).map((c) => c.id)
      const { data: documents } = await supabase
        .from('documents')
        .select('owner_id')
        .eq('owner_type', 'COTA')
        .eq('document_type', 'COTA_STATEMENT')
        .in('owner_id', cotaIds)

      const cotasWithDocuments = cotaIds.filter((id) =>
        documents?.some((d) => d.owner_id === id)
      )

      const transformedCotas: CotaWithSeller[] = (data || []).map((cota) => ({
        id: cota.id,
        administrator: cota.administrator,
        credit_amount: Number(cota.credit_amount),
        entry_amount: Number(cota.entry_amount),
        n_installments: cota.n_installments,
        status: cota.status,
        created_at: cota.created_at,
        seller: Array.isArray(cota.seller) ? cota.seller[0] : cota.seller,
        hasStatement: cotasWithDocuments.includes(cota.id),
      }))

      setCotas(transformedCotas)
      setTotalCount(count || 0)
      setLoading(false)
    }

    fetchCotas()
  }, [pathname, page, statusFilter, searchTerm])

  const handleStatusChange = (cota: CotaWithSeller, newStatus: CotaStatus) => {
    if (newStatus === cota.status) return
    setStatusDialog({ open: true, cota, newStatus })
  }

  const confirmStatusChange = async () => {
    if (!statusDialog.cota || !statusDialog.newStatus) return

    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/cotas/${statusDialog.cota.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusDialog.newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Erro ao atualizar status')
        return
      }

      // Update local state
      setCotas((prev) =>
        prev.map((c) =>
          c.id === statusDialog.cota!.id
            ? { ...c, status: statusDialog.newStatus! }
            : c
        )
      )

      setStatusDialog({ open: false, cota: null, newStatus: null })
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Erro ao atualizar status. Tente novamente.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotas</h1>
          <p className="text-muted-foreground">Gerenciar e revisar cotas publicadas</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por administradora..."
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
                <option value="AVAILABLE">Disponível</option>
                <option value="RESERVED">Reservada</option>
                <option value="SOLD">Vendida</option>
                <option value="REMOVED">Removida</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cotas Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Lista de Cotas ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando cotas...</p>
            </div>
          ) : cotas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma cota encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Administradora</th>
                    <th className="text-left p-3 font-medium">Vendedor</th>
                    <th className="text-right p-3 font-medium">Crédito</th>
                    <th className="text-right p-3 font-medium">Entrada</th>
                    <th className="text-center p-3 font-medium">Parcelas</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Extrato</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cotas.map((cota) => (
                    <tr key={cota.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{cota.administrator}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(cota.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>{cota.seller?.full_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{cota.seller?.email}</div>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(cota.credit_amount)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(cota.entry_amount)}
                      </td>
                      <td className="p-3 text-center">{cota.n_installments}x</td>
                      <td className="p-3 text-center">
                        <select
                          value={cota.status}
                          onChange={(e) => handleStatusChange(cota, e.target.value as CotaStatus)}
                          className={`h-8 rounded-md border px-2 py-1 text-xs font-medium cursor-pointer transition-colors ${
                            cota.status === 'AVAILABLE'
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : cota.status === 'RESERVED'
                              ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                              : cota.status === 'SOLD'
                              ? 'bg-gray-100 border-gray-300 text-gray-800'
                              : 'bg-red-100 border-red-300 text-red-800'
                          }`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        {cota.hasStatement ? (
                          <Badge variant="success" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Não</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Link href={`/admin/cotas/${cota.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-4 pt-4 border-t"
            />
          )}
        </CardContent>
      </Card>

      {/* Status Change Confirmation Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open && !updatingStatus) {
            setStatusDialog({ open: false, cota: null, newStatus: null })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração de Status</DialogTitle>
            <DialogDescription>
              Você está prestes a alterar o status da cota{' '}
              <strong>{statusDialog.cota?.administrator}</strong> de{' '}
              <strong>{getCotaStatusLabel(statusDialog.cota?.status || 'AVAILABLE')}</strong> para{' '}
              <strong>{getCotaStatusLabel(statusDialog.newStatus || 'AVAILABLE')}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação será registrada no histórico da cota.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, cota: null, newStatus: null })}
              disabled={updatingStatus}
            >
              Cancelar
            </Button>
            <Button onClick={confirmStatusChange} disabled={updatingStatus}>
              {updatingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
