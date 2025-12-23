'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { FileText, Eye, AlertCircle, Clock, CheckCircle, XCircle, ArrowRight, FileCheck, CreditCard, Layers } from 'lucide-react'
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

// Status timeline steps
const TIMELINE_STEPS = [
  { status: 'UNDER_REVIEW', label: 'Em Análise', icon: Clock },
  { status: 'PRE_APPROVED', label: 'Pré-Aprovada', icon: FileCheck },
  { status: 'APPROVED', label: 'Aprovada', icon: CheckCircle },
  { status: 'TRANSFER_STARTED', label: 'Transferência', icon: ArrowRight },
  { status: 'COMPLETED', label: 'Concluída', icon: CreditCard },
]

function getStatusIndex(status: ProposalStatus): number {
  if (status === 'REJECTED') return -1
  const index = TIMELINE_STEPS.findIndex(s => s.status === status)
  return index >= 0 ? index : 0
}

// Summary cards component
function SummaryCards({ proposals }: { proposals: ProposalWithCota[] }) {
  const underReview = proposals.filter(p => p.status === 'UNDER_REVIEW' || p.status === 'PRE_APPROVED').length
  const approved = proposals.filter(p => p.status === 'APPROVED' || p.status === 'TRANSFER_STARTED').length
  const completed = proposals.filter(p => p.status === 'COMPLETED').length
  const rejected = proposals.filter(p => p.status === 'REJECTED').length

  // Count unique groups (composições)
  const uniqueGroups = new Set(proposals.filter(p => p.group_id).map(p => p.group_id))
  const groupCount = uniqueGroups.size

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-stagger">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-yellow-700 mb-1">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Em Análise</span>
        </div>
        <p className="text-2xl font-bold text-yellow-800 tabular-nums">{underReview}</p>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-green-700 mb-1">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Aprovadas</span>
        </div>
        <p className="text-2xl font-bold text-green-800 tabular-nums">{approved}</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-blue-700 mb-1">
          <CreditCard className="h-4 w-4" />
          <span className="text-sm font-medium">Concluídas</span>
        </div>
        <p className="text-2xl font-bold text-blue-800 tabular-nums">{completed}</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
        <div className="flex items-center gap-2 text-red-700 mb-1">
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Rejeitadas</span>
        </div>
        <p className="text-2xl font-bold text-red-800 tabular-nums">{rejected}</p>
      </div>
      {groupCount > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
          <div className="flex items-center gap-2 text-purple-700 mb-1">
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium">Composições</span>
          </div>
          <p className="text-2xl font-bold text-purple-800 tabular-nums">{groupCount}</p>
        </div>
      )}
    </div>
  )
}

// Timeline component
function StatusTimeline({ status }: { status: ProposalStatus }) {
  const currentIndex = getStatusIndex(status)
  const isRejected = status === 'REJECTED'

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <XCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Proposta Rejeitada</span>
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

// Proposal card component
function ProposalCard({
  proposal,
  onViewDetails,
  groupInfo
}: {
  proposal: ProposalWithCota
  onViewDetails: () => void
  groupInfo?: { count: number; index: number } | null
}) {
  const currentIndex = getStatusIndex(proposal.status)
  const isRejected = proposal.status === 'REJECTED'
  const isGrouped = !!proposal.group_id && groupInfo && groupInfo.count > 1

  return (
    <Card className={`border card-hover ${isRejected ? 'border-red-200 bg-red-50/30' : proposal.status === 'COMPLETED' ? 'border-green-200 bg-green-50/30' : ''}`}>
      <CardContent className="p-4">
        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Header with title and status */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base truncate">{proposal.cota?.administrator || 'Administradora'}</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <Badge variant={getStatusBadgeVariant(proposal.status)} className="shrink-0">
              {getProposalStatusLabel(proposal.status)}
            </Badge>
          </div>

          {isGrouped && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 mb-3">
              <Layers className="h-3 w-3 mr-1" />
              Composição ({groupInfo.index}/{groupInfo.count})
            </Badge>
          )}

          {/* Values Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Crédito</p>
              <p className="font-medium">{proposal.cota ? formatCurrency(proposal.cota.credit_amount) : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Entrada</p>
              <p className="font-medium">{proposal.cota ? formatCurrency(proposal.cota.entry_amount) : '-'}</p>
            </div>
          </div>

          {/* Timeline - Compact for mobile */}
          <div className="mb-3">
            <StatusTimeline status={proposal.status} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            {isGrouped && (
              <Link href={`/composicao/${proposal.group_id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full bg-purple-50 border-purple-200 text-purple-700">
                  <Layers className="h-4 w-4 mr-1" />
                  Grupo
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" className={isGrouped ? "flex-1" : "w-full"} onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-1" />
              Detalhes
            </Button>
          </div>

          {/* Rejection reason */}
          {isRejected && proposal.rejection_reason && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Motivo da rejeição:</p>
                  <p className="text-sm text-red-700">{proposal.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Current step info */}
          {!isRejected && currentIndex >= 0 && currentIndex < TIMELINE_STEPS.length && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <span className="font-medium text-primary">Próximo passo: </span>
                {proposal.status === 'UNDER_REVIEW' && 'Aguardando análise da proposta.'}
                {proposal.status === 'PRE_APPROVED' && 'Envie os documentos necessários.'}
                {proposal.status === 'APPROVED' && 'Realize o pagamento da entrada.'}
                {proposal.status === 'TRANSFER_STARTED' && 'Transferência em andamento.'}
                {proposal.status === 'COMPLETED' && 'Cota transferida com sucesso!'}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="flex flex-row items-center justify-between gap-4">
            {/* Cota Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-lg">{proposal.cota?.administrator || 'Administradora'}</h3>
                <Badge variant={getStatusBadgeVariant(proposal.status)}>
                  {getProposalStatusLabel(proposal.status)}
                </Badge>
                {isGrouped && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                    <Layers className="h-3 w-3 mr-1" />
                    Composição ({groupInfo.index}/{groupInfo.count})
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Crédito:</span>
                  <p className="font-medium">{proposal.cota ? formatCurrency(proposal.cota.credit_amount) : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entrada:</span>
                  <p className="font-medium">{proposal.cota ? formatCurrency(proposal.cota.entry_amount) : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Parcelas:</span>
                  <p className="font-medium">{proposal.cota?.n_installments}x</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{new Date(proposal.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Timeline and Actions */}
            <div className="flex flex-col items-end gap-3">
              <StatusTimeline status={proposal.status} />
              <div className="flex gap-2">
                {isGrouped && (
                  <Link href={`/composicao/${proposal.group_id}`}>
                    <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105 press-effect bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100">
                      <Layers className="h-4 w-4 mr-1" />
                      Ver Grupo
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105 press-effect" onClick={onViewDetails}>
                  <Eye className="h-4 w-4 mr-1" />
                  Detalhes
                </Button>
              </div>
            </div>
          </div>

          {/* Rejection reason */}
          {isRejected && proposal.rejection_reason && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Motivo da rejeição:</p>
                  <p className="text-sm text-red-700">{proposal.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Current step info */}
          {!isRejected && currentIndex >= 0 && currentIndex < TIMELINE_STEPS.length && (
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <span className="font-medium text-primary">Próximo passo: </span>
                {proposal.status === 'UNDER_REVIEW' && 'Aguardando análise da proposta pelo vendedor.'}
                {proposal.status === 'PRE_APPROVED' && 'Envie os documentos necessários para aprovação final.'}
                {proposal.status === 'APPROVED' && 'Realize o pagamento da entrada para iniciar a transferência.'}
                {proposal.status === 'TRANSFER_STARTED' && 'Transferência em andamento junto à administradora.'}
                {proposal.status === 'COMPLETED' && 'Parabéns! Sua cota foi transferida com sucesso.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MinhasPropostasPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const [proposals, setProposals] = useState<ProposalWithCota[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/minhas-propostas')
    }
  }, [user, authLoading, router])

  // Fetch user's proposals
  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return

      setLoading(true)
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          cota:cotas(*)
        `)
        .eq('buyer_pf_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching proposals:', error)
      } else {
        setProposals((data as unknown as ProposalWithCota[]) || [])
      }
      setLoading(false)
    }

    if (user) {
      fetchProposals()
    } else if (!authLoading) {
      // User is not logged in and auth is done loading
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable
  }, [user, authLoading, pathname])

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
              Minhas Propostas
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Acompanhe o status das suas propostas de compra
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-primary-darker">
                    Suas Propostas
                  </h2>
                  <p className="text-muted-foreground">
                    {proposals.length} {proposals.length === 1 ? 'proposta' : 'propostas'} no total
                  </p>
                </div>
                <Link href="/cotas">
                  <Button variant="outline">
                    Ver Cotas Disponíveis
                  </Button>
                </Link>
              </div>

              {/* Summary Cards */}
              {!loading && proposals.length > 0 && <SummaryCards proposals={proposals} />}

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Carregando suas propostas...</p>
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Você ainda não fez nenhuma proposta.
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Explore as cotas disponíveis e clique em &quot;Tenho Interesse&quot; para iniciar uma proposta.
                  </p>
                  <Link href="/cotas">
                    <Button>Ver Cotas Disponíveis</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Compute group information for all proposals
                    const groupCounts: Record<string, number> = {}
                    const groupIndexes: Record<string, number> = {}

                    // First pass: count proposals per group
                    proposals.forEach((p) => {
                      if (p.group_id) {
                        groupCounts[p.group_id] = (groupCounts[p.group_id] || 0) + 1
                      }
                    })

                    // Second pass: assign index within each group
                    const groupCurrentIndex: Record<string, number> = {}
                    proposals.forEach((p) => {
                      if (p.group_id) {
                        groupCurrentIndex[p.group_id] = (groupCurrentIndex[p.group_id] || 0) + 1
                        groupIndexes[p.id] = groupCurrentIndex[p.group_id]
                      }
                    })

                    return proposals.map((proposal) => {
                      const groupInfo = proposal.group_id
                        ? {
                            count: groupCounts[proposal.group_id],
                            index: groupIndexes[proposal.id]
                          }
                        : null

                      return (
                        <ProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          groupInfo={groupInfo}
                          onViewDetails={() => router.push(`/proposta/${proposal.id}`)}
                        />
                      )
                    })
                  })()}
                </div>
              )}

              {/* Timeline Legend */}
              {proposals.length > 0 && (
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
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
