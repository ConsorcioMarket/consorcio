'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Layers,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileCheck,
  ArrowRight,
  CreditCard,
  Building2,
  Calculator,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, getProposalStatusLabel } from '@/lib/utils'
import type { ProposalStatus, Cota } from '@/types/database'

interface ProposalWithCota {
  id: string
  cota_id: string
  buyer_pf_id: string
  buyer_type: 'PF' | 'PJ'
  buyer_entity_id: string
  group_id: string | null
  status: ProposalStatus
  rejection_reason: string | null
  transfer_fee: number | null
  created_at: string
  updated_at: string
  cota: Cota
}

// Status timeline steps
const TIMELINE_STEPS = [
  { status: 'UNDER_REVIEW', label: 'Em Análise', icon: Clock },
  { status: 'PRE_APPROVED', label: 'Pré-Aprovada', icon: FileCheck },
  { status: 'APPROVED', label: 'Aprovada', icon: CheckCircle },
  { status: 'TRANSFER_STARTED', label: 'Transferência', icon: ArrowRight },
  { status: 'COMPLETED', label: 'Concluída', icon: CreditCard },
]

function getStatusBadgeVariant(status: ProposalStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<ProposalStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    UNDER_REVIEW: 'warning',
    PRE_APPROVED: 'default',
    APPROVED: 'success',
    TRANSFER_STARTED: 'default',
    COMPLETED: 'success',
    REJECTED: 'destructive',
  }
  return variants[status] || 'outline'
}

function getStatusIndex(status: ProposalStatus): number {
  if (status === 'REJECTED') return -1
  const index = TIMELINE_STEPS.findIndex((s) => s.status === status)
  return index >= 0 ? index : 0
}

// Get group overall status
function getGroupStatus(proposals: ProposalWithCota[]): {
  status: 'pending' | 'partial' | 'approved' | 'completed' | 'rejected'
  label: string
  description: string
} {
  const hasRejected = proposals.some((p) => p.status === 'REJECTED')
  const allCompleted = proposals.every((p) => p.status === 'COMPLETED')
  const allApproved = proposals.every((p) => p.status === 'APPROVED' || p.status === 'TRANSFER_STARTED' || p.status === 'COMPLETED')
  const anyApproved = proposals.some((p) => p.status === 'APPROVED' || p.status === 'PRE_APPROVED')

  if (hasRejected) {
    return {
      status: 'rejected',
      label: 'Atenção Necessária',
      description: 'Uma ou mais propostas foram rejeitadas. Você pode remover as rejeitadas e continuar com as aprovadas.',
    }
  }
  if (allCompleted) {
    return {
      status: 'completed',
      label: 'Concluída',
      description: 'Todas as cotas foram transferidas com sucesso!',
    }
  }
  if (allApproved) {
    return {
      status: 'approved',
      label: 'Aprovada',
      description: 'Todas as propostas foram aprovadas. Você pode prosseguir com o pagamento.',
    }
  }
  if (anyApproved) {
    return {
      status: 'partial',
      label: 'Parcialmente Aprovada',
      description: 'Algumas propostas ainda estão em análise.',
    }
  }
  return {
    status: 'pending',
    label: 'Em Análise',
    description: 'Suas propostas estão sendo analisadas.',
  }
}

// Timeline component
function StatusTimeline({ status }: { status: ProposalStatus }) {
  const currentIndex = getStatusIndex(status)
  const isRejected = status === 'REJECTED'

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <XCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Rejeitada</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {TIMELINE_STEPS.map((step, index) => {
        const Icon = step.icon
        const isCompleted = index <= currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={step.status} className="flex items-center">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                isCompleted
                  ? isCurrent
                    ? 'bg-primary text-white scale-110 shadow-md'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
              title={step.label}
            >
              <Icon className="h-3 w-3" />
            </div>
            {index < TIMELINE_STEPS.length - 1 && (
              <div
                className={`w-4 h-0.5 transition-colors duration-300 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ComposicaoPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const groupId = params.groupId as string
  const { user, loading: authLoading } = useAuth()
  const [proposals, setProposals] = useState<ProposalWithCota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/minhas-propostas')
    }
  }, [user, authLoading, router])

  // Fetch group proposals
  useEffect(() => {
    const fetchProposals = async () => {
      if (!user || !groupId) return

      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('proposals')
        .select(`
          *,
          cota:cotas(*)
        `)
        .eq('group_id', groupId)
        .eq('buyer_pf_id', user.id)
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.error('Error fetching group proposals:', fetchError)
        setError('Erro ao carregar as propostas do grupo.')
      } else if (!data || data.length === 0) {
        setError('Grupo não encontrado ou você não tem acesso.')
      } else {
        setProposals((data as unknown as ProposalWithCota[]) || [])
      }
      setLoading(false)
    }

    if (user) {
      fetchProposals()
    } else if (!authLoading) {
      // User is not logged in and auth is done loading
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Cleanup state when user logs out
      setLoading(false)
    }
  }, [user, authLoading, groupId, pathname])

  // Calculate totals
  const totals = useMemo(() => {
    return proposals.reduce(
      (acc, p) => {
        if (p.cota) {
          acc.creditTotal += Number(p.cota.credit_amount) || 0
          acc.entryTotal += Number(p.cota.entry_amount) || 0
          acc.balanceTotal += Number(p.cota.outstanding_balance) || 0
        }
        return acc
      },
      { creditTotal: 0, entryTotal: 0, balanceTotal: 0 }
    )
  }, [proposals])

  const groupStatus = useMemo(() => getGroupStatus(proposals), [proposals])

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      approved: proposals.filter((p) => p.status === 'APPROVED' || p.status === 'PRE_APPROVED').length,
      rejected: proposals.filter((p) => p.status === 'REJECTED').length,
      pending: proposals.filter((p) => p.status === 'UNDER_REVIEW').length,
      completed: proposals.filter((p) => p.status === 'COMPLETED' || p.status === 'TRANSFER_STARTED').length,
    }
  }, [proposals])

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
      <section className="bg-gradient-hero text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Layers className="h-8 w-8" />
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">Composição de Cotas</h1>
            </div>
            <p className="text-lg md:text-xl text-white/90">
              Gerencie suas propostas de compra agrupadas
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          {/* Back button */}
          <Link href="/minhas-propostas" className="inline-flex items-center text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para Minhas Propostas
          </Link>

          {loading ? (
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Carregando propostas do grupo...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Link href="/minhas-propostas">
                  <Button>Voltar para Minhas Propostas</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Group Status Card */}
              <Card className={`mb-6 border-2 ${
                groupStatus.status === 'rejected'
                  ? 'border-red-300 bg-red-50'
                  : groupStatus.status === 'completed'
                    ? 'border-green-300 bg-green-50'
                    : groupStatus.status === 'approved'
                      ? 'border-green-300 bg-green-50'
                      : 'border-purple-300 bg-purple-50'
              }`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${
                        groupStatus.status === 'rejected'
                          ? 'bg-red-200'
                          : groupStatus.status === 'completed' || groupStatus.status === 'approved'
                            ? 'bg-green-200'
                            : 'bg-purple-200'
                      }`}>
                        {groupStatus.status === 'rejected' ? (
                          <AlertCircle className="h-6 w-6 text-red-700" />
                        ) : groupStatus.status === 'completed' ? (
                          <CheckCircle className="h-6 w-6 text-green-700" />
                        ) : (
                          <Layers className="h-6 w-6 text-purple-700" />
                        )}
                      </div>
                      <div>
                        <h2 className={`text-xl font-bold ${
                          groupStatus.status === 'rejected'
                            ? 'text-red-800'
                            : groupStatus.status === 'completed' || groupStatus.status === 'approved'
                              ? 'text-green-800'
                              : 'text-purple-800'
                        }`}>
                          {groupStatus.label}
                        </h2>
                        <p className={`text-sm ${
                          groupStatus.status === 'rejected'
                            ? 'text-red-700'
                            : groupStatus.status === 'completed' || groupStatus.status === 'approved'
                              ? 'text-green-700'
                              : 'text-purple-700'
                        }`}>
                          {groupStatus.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-gray-500 text-white shadow hover:bg-gray-600 border-transparent">
                        {proposals.length} {proposals.length === 1 ? 'cota' : 'cotas'}
                      </Badge>
                      {statusCounts.approved > 0 && (
                        <Badge variant="success">{statusCounts.approved} aprovadas</Badge>
                      )}
                      {statusCounts.pending > 0 && (
                        <Badge variant="warning">{statusCounts.pending} em análise</Badge>
                      )}
                      {statusCounts.rejected > 0 && (
                        <Badge variant="destructive">{statusCounts.rejected} rejeitadas</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Totals Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-white shadow border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Crédito Total</p>
                        <p className="text-xl font-bold text-blue-700">{formatCurrency(totals.creditTotal)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calculator className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Entrada Total</p>
                        <p className="text-xl font-bold text-green-700">{formatCurrency(totals.entryTotal)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo Devedor Total</p>
                        <p className="text-xl font-bold text-orange-700">{formatCurrency(totals.balanceTotal)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Proposals List */}
              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Cotas da Composição</h3>
                  <div className="space-y-4">
                    {proposals.map((proposal, index) => (
                      <div
                        key={proposal.id}
                        className={`border rounded-lg p-4 ${
                          proposal.status === 'REJECTED'
                            ? 'border-red-200 bg-red-50/50'
                            : proposal.status === 'COMPLETED'
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-sm text-muted-foreground">Cota {index + 1}</span>
                              <h4 className="font-semibold">{proposal.cota?.administrator || 'Administradora'}</h4>
                              <Badge variant={getStatusBadgeVariant(proposal.status)}>
                                {getProposalStatusLabel(proposal.status)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Crédito:</span>
                                <p className="font-medium">{proposal.cota ? formatCurrency(Number(proposal.cota.credit_amount)) : '-'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Entrada:</span>
                                <p className="font-medium">{proposal.cota ? formatCurrency(Number(proposal.cota.entry_amount)) : '-'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Parcelas:</span>
                                <p className="font-medium">{proposal.cota?.n_installments}x</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Valor Parcela:</span>
                                <p className="font-medium">{proposal.cota ? formatCurrency(Number(proposal.cota.installment_value)) : '-'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <StatusTimeline status={proposal.status} />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/proposta/${proposal.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>

                        {/* Rejection reason */}
                        {proposal.status === 'REJECTED' && proposal.rejection_reason && (
                          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Motivo da rejeição:</p>
                                <p className="text-sm text-red-700">{proposal.rejection_reason}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  {groupStatus.status === 'approved' && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-green-800">Todas as propostas foram aprovadas!</p>
                          <p className="text-sm text-green-700">Você pode prosseguir com o pagamento da entrada.</p>
                        </div>
                        <Button className="bg-green-600 hover:bg-green-700">
                          Ir para Pagamento
                        </Button>
                      </div>
                    </div>
                  )}

                  {groupStatus.status === 'rejected' && statusCounts.approved > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-yellow-800">
                            Você tem {statusCounts.approved} proposta(s) aprovada(s)
                          </p>
                          <p className="text-sm text-yellow-700">
                            Você pode continuar apenas com as propostas aprovadas ou buscar outras cotas.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href="/cotas">
                            <Button variant="outline">
                              Buscar Mais Cotas
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline Legend */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-4">Etapas do Processo</h4>
                <div className="flex flex-wrap gap-6">
                  {TIMELINE_STEPS.map((step) => {
                    const Icon = step.icon
                    return (
                      <div key={step.status} className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600">
                          <Icon className="h-3 w-3" />
                        </div>
                        <span className="text-sm text-muted-foreground">{step.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
