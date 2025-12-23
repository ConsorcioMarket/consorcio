'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Plus, Eye, Pencil, Trash2, AlertCircle, Users, Clock, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatPercentage, getCotaStatusLabel } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import type { Cota, CotaStatus, ProposalStatus } from '@/types/database'

// Proposal count by status for each cota
interface ProposalSummary {
  total: number
  underReview: number
  approved: number
  rejected: number
  completed: number
}

interface CotaWithProposals extends Cota {
  proposals?: ProposalSummary
}

function getStatusBadgeVariant(status: CotaStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<CotaStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    AVAILABLE: 'success',
    RESERVED: 'warning',
    SOLD: 'secondary',
    REMOVED: 'destructive',
  }
  return variants[status] || 'outline'
}

// Summary cards component
function SummaryCards({ cotas }: { cotas: CotaWithProposals[] }) {
  const available = cotas.filter(c => c.status === 'AVAILABLE').length
  const reserved = cotas.filter(c => c.status === 'RESERVED').length
  const sold = cotas.filter(c => c.status === 'SOLD').length
  const totalProposals = cotas.reduce((sum, c) => sum + (c.proposals?.total || 0), 0)
  const pendingProposals = cotas.reduce((sum, c) => sum + (c.proposals?.underReview || 0), 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-stagger">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-green-700 mb-1">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Disponíveis</span>
        </div>
        <p className="text-2xl font-bold text-green-800 tabular-nums">{available}</p>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-yellow-700 mb-1">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Reservadas</span>
        </div>
        <p className="text-2xl font-bold text-yellow-800 tabular-nums">{reserved}</p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-gray-700 mb-1">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Vendidas</span>
        </div>
        <p className="text-2xl font-bold text-gray-800 tabular-nums">{sold}</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-blue-700 mb-1">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">Propostas</span>
        </div>
        <p className="text-2xl font-bold text-blue-800 tabular-nums">{totalProposals}</p>
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-orange-700 mb-1">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Pendentes</span>
        </div>
        <p className="text-2xl font-bold text-orange-800 tabular-nums">{pendingProposals}</p>
      </div>
    </div>
  )
}

// Proposal indicator component
function ProposalIndicator({ proposals }: { proposals?: ProposalSummary }) {
  if (!proposals || proposals.total === 0) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        title={`${proposals.total} proposta(s) no total`}
      >
        <Users className="h-3 w-3" />
        {proposals.total}
      </span>
      {proposals.underReview > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
          title={`${proposals.underReview} em análise`}
        >
          <Clock className="h-3 w-3" />
          {proposals.underReview}
        </span>
      )}
      {proposals.approved > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
          title={`${proposals.approved} aprovada(s)`}
        >
          <CheckCircle className="h-3 w-3" />
          {proposals.approved}
        </span>
      )}
    </div>
  )
}

export default function MinhasCotasPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [cotas, setCotas] = useState<CotaWithProposals[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cotaToDelete, setCotaToDelete] = useState<Cota | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/minhas-cotas')
    }
  }, [user, authLoading, router])

  // Fetch user's cotas with proposal counts
  useEffect(() => {
    const fetchCotas = async () => {
      if (!user) return

      setLoading(true)

      // Fetch cotas
      const { data: cotasData, error: cotasError } = await supabase
        .from('cotas')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (cotasError) {
        console.error('Error fetching cotas:', cotasError)
        setLoading(false)
        return
      }

      // Fetch proposals for these cotas
      const cotaIds = (cotasData || []).map(c => c.id)

      if (cotaIds.length > 0) {
        const { data: proposalsData, error: proposalsError } = await supabase
          .from('proposals')
          .select('cota_id, status')
          .in('cota_id', cotaIds)

        if (!proposalsError && proposalsData) {
          // Group proposals by cota_id
          const proposalsByCota: Record<string, ProposalSummary> = {}

          proposalsData.forEach((p: { cota_id: string; status: ProposalStatus }) => {
            if (!proposalsByCota[p.cota_id]) {
              proposalsByCota[p.cota_id] = {
                total: 0,
                underReview: 0,
                approved: 0,
                rejected: 0,
                completed: 0,
              }
            }
            proposalsByCota[p.cota_id].total++

            if (p.status === 'UNDER_REVIEW' || p.status === 'PRE_APPROVED') {
              proposalsByCota[p.cota_id].underReview++
            } else if (p.status === 'APPROVED' || p.status === 'TRANSFER_STARTED') {
              proposalsByCota[p.cota_id].approved++
            } else if (p.status === 'REJECTED') {
              proposalsByCota[p.cota_id].rejected++
            } else if (p.status === 'COMPLETED') {
              proposalsByCota[p.cota_id].completed++
            }
          })

          // Merge proposals into cotas
          const cotasWithProposals: CotaWithProposals[] = (cotasData || []).map(cota => ({
            ...cota,
            proposals: proposalsByCota[cota.id] || undefined,
          }))

          setCotas(cotasWithProposals)
        } else {
          setCotas(cotasData || [])
        }
      } else {
        setCotas(cotasData || [])
      }

      setLoading(false)
    }

    if (user) {
      fetchCotas()
    } else if (!authLoading) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable
  }, [user, authLoading, pathname])

  const handleDeleteClick = (cota: Cota) => {
    setCotaToDelete(cota)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!cotaToDelete) return

    setDeleting(true)
    const { error } = await supabase
      .from('cotas')
      .delete()
      .eq('id', cotaToDelete.id)

    if (error) {
      console.error('Error deleting cota:', error)
      addToast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a cota. Tente novamente.',
        variant: 'error',
      })
    } else {
      setCotas(cotas.filter((c) => c.id !== cotaToDelete.id))
      addToast({
        title: 'Cota excluída',
        description: 'A cota foi removida com sucesso.',
        variant: 'success',
      })
    }

    setDeleting(false)
    setDeleteDialogOpen(false)
    setCotaToDelete(null)
  }

  const canEditOrDelete = (status: CotaStatus) => {
    return status === 'AVAILABLE'
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Minhas Cotas
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Gerencie suas cotas de consórcio anunciadas
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              {/* Header with action button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-primary-darker">
                    Suas Cotas Anunciadas
                  </h2>
                  <p className="text-muted-foreground">
                    {cotas.length} {cotas.length === 1 ? 'cota' : 'cotas'} no total
                  </p>
                </div>
                <Link href="/publicar-cota">
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Anunciar Nova Cota
                  </Button>
                </Link>
              </div>

              {/* Summary Cards */}
              {!loading && cotas.length > 0 && <SummaryCards cotas={cotas} />}

              {loading ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Administradora</TableHead>
                        <TableHead>Crédito</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Propostas</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : cotas.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Você ainda não anunciou nenhuma cota.
                  </p>
                  <Link href="/publicar-cota">
                    <Button>Anunciar minha primeira cota</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Mobile: Card View */}
                  <div className="md:hidden space-y-4">
                    {cotas.map((cota) => (
                      <div
                        key={cota.id}
                        className={`border rounded-lg p-4 ${cota.proposals && cota.proposals.underReview > 0 ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base truncate">{cota.administrator}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(cota.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(cota.status)} className="shrink-0">
                            {getCotaStatusLabel(cota.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Crédito</p>
                            <p className="font-medium">{formatCurrency(cota.credit_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Entrada</p>
                            <p className="font-medium">
                              {formatCurrency(cota.entry_amount)}
                              <span className="text-muted-foreground text-xs ml-1">
                                ({formatPercentage(cota.entry_percentage)})
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Parcelas</p>
                            <p className="font-medium">{cota.n_installments}x</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Propostas</p>
                            <ProposalIndicator proposals={cota.proposals} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/cota/${cota.id}`)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          {canEditOrDelete(cota.status) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/editar-cota/${cota.id}`)}
                                className="flex-1"
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(cota)}
                                className="text-red-600 hover:text-red-700 border-red-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Administradora</TableHead>
                          <TableHead>Crédito</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Parcelas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Propostas</TableHead>
                          <TableHead>Criada em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cotas.map((cota) => (
                          <TableRow key={cota.id} className={cota.proposals && cota.proposals.underReview > 0 ? 'bg-yellow-50/50' : ''}>
                            <TableCell className="font-medium">
                              {cota.administrator}
                            </TableCell>
                            <TableCell>{formatCurrency(cota.credit_amount)}</TableCell>
                            <TableCell>
                              {formatCurrency(cota.entry_amount)}
                              <span className="text-muted-foreground text-xs ml-1">
                                ({formatPercentage(cota.entry_percentage)})
                              </span>
                            </TableCell>
                            <TableCell>{cota.n_installments}x</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(cota.status)}>
                                {getCotaStatusLabel(cota.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <ProposalIndicator proposals={cota.proposals} />
                            </TableCell>
                            <TableCell>
                              {new Date(cota.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/cota/${cota.id}`)}
                                  title="Ver detalhes"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canEditOrDelete(cota.status) && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => router.push(`/editar-cota/${cota.id}`)}
                                      title="Editar"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteClick(cota)}
                                      className="text-red-600 hover:text-red-700"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Legend */}
              {cotas.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Users className="h-3 w-3" />
                        N
                      </span>
                      <span>Total de propostas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3" />
                        N
                      </span>
                      <span>Em análise</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        N
                      </span>
                      <span>Aprovadas</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cota</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta cota? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {cotaToDelete && (
            <div className="py-4">
              <p className="text-sm">
                <strong>Administradora:</strong> {cotaToDelete.administrator}
              </p>
              <p className="text-sm">
                <strong>Crédito:</strong> {formatCurrency(cotaToDelete.credit_amount)}
              </p>
              <p className="text-sm">
                <strong>Entrada:</strong> {formatCurrency(cotaToDelete.entry_amount)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
