'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { CreditCard, Eye, FileText, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

function getStatusBadgeVariant(status: CotaStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<CotaStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    AVAILABLE: 'success',
    RESERVED: 'warning',
    SOLD: 'default',
    REMOVED: 'destructive',
  }
  return variants[status] || 'outline'
}

const PAGE_SIZE = 10

export default function AdminCotasPage() {
  const [cotas, setCotas] = useState<CotaWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = useMemo(() => createClient(), [])

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
  }, [supabase, page, statusFilter, searchTerm])

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
                        <Badge variant={getStatusBadgeVariant(cota.status)}>
                          {getCotaStatusLabel(cota.status)}
                        </Badge>
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
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, totalCount)} de {totalCount} cotas
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
    </div>
  )
}
