'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  User,
  Briefcase,
  History
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatPercentage, getProposalStatusLabel, getCotaStatusLabel } from '@/lib/utils'
import type { ProposalStatus, CotaStatus, ProposalHistory, Cota, ProfilePF, ProfilePJ } from '@/types/database'

interface ProposalWithRelations {
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

function getCotaStatusBadgeVariant(status: CotaStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<CotaStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    AVAILABLE: 'success',
    RESERVED: 'warning',
    SOLD: 'secondary',
    REMOVED: 'destructive',
  }
  return variants[status] || 'outline'
}

function getStatusIcon(status: ProposalStatus) {
  switch (status) {
    case 'UNDER_REVIEW':
      return <Clock className="h-5 w-5 text-yellow-500" />
    case 'PRE_APPROVED':
      return <FileText className="h-5 w-5 text-blue-500" />
    case 'APPROVED':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case 'TRANSFER_STARTED':
      return <Clock className="h-5 w-5 text-blue-500" />
    case 'COMPLETED':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case 'REJECTED':
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Clock className="h-5 w-5 text-gray-500" />
  }
}

function getStatusDescription(status: ProposalStatus): string {
  const descriptions: Record<ProposalStatus, string> = {
    UNDER_REVIEW: 'Sua proposta está sendo analisada pela equipe. Aguarde o retorno.',
    PRE_APPROVED: 'Proposta pré-aprovada! Aguardando documentos do vendedor.',
    APPROVED: 'Proposta aprovada! Você pode prosseguir com o pagamento.',
    TRANSFER_STARTED: 'Transferência em andamento. Acompanhe as instruções enviadas.',
    COMPLETED: 'Parabéns! A transferência foi concluída com sucesso.',
    REJECTED: 'Infelizmente sua proposta foi rejeitada.',
  }
  return descriptions[status] || ''
}

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const [proposal, setProposal] = useState<ProposalWithRelations | null>(null)
  const [history, setHistory] = useState<ProposalHistory[]>([])
  const [buyerEntity, setBuyerEntity] = useState<ProfilePF | ProfilePJ | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [notAllowed, setNotAllowed] = useState(false)

  const supabase = createClient()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?returnUrl=/proposta/${id}`)
    }
  }, [user, authLoading, router, id])

  // Fetch proposal data
  useEffect(() => {
    const fetchProposal = async () => {
      if (!user || !id) {
        setLoading(false)
        return
      }

      // Fetch proposal with cota
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          *,
          cota:cotas(*)
        `)
        .eq('id', id)
        .single()

      if (proposalError || !proposalData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const typedProposal = proposalData as unknown as ProposalWithRelations

      // Check if user is the buyer or the seller
      const isBuyer = typedProposal.buyer_pf_id === user.id
      const isSeller = typedProposal.cota?.seller_id === user.id

      if (!isBuyer && !isSeller) {
        setNotAllowed(true)
        setLoading(false)
        return
      }

      setProposal(typedProposal)

      // Fetch proposal history
      const { data: historyData } = await supabase
        .from('proposal_history')
        .select('*')
        .eq('proposal_id', id)
        .order('changed_at', { ascending: false })

      if (historyData) {
        setHistory(historyData)
      }

      // Fetch buyer entity details
      if (typedProposal.buyer_type === 'PF') {
        const { data: pfData } = await supabase
          .from('profiles_pf')
          .select('*')
          .eq('id', typedProposal.buyer_entity_id)
          .single()
        if (pfData) setBuyerEntity(pfData)
      } else {
        const { data: pjData } = await supabase
          .from('profiles_pj')
          .select('*')
          .eq('id', typedProposal.buyer_entity_id)
          .single()
        if (pjData) setBuyerEntity(pjData)
      }

      setLoading(false)
    }

    if (user) {
      fetchProposal()
    }
  }, [id, user, pathname])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-hero text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl font-bold">Proposta não encontrada</h1>
            </div>
          </div>
        </section>
        <section className="section-light py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-muted-foreground mb-6">
                  A proposta que você está procurando não foi encontrada.
                </p>
                <Link href="/minhas-propostas">
                  <Button>Ver Minhas Propostas</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  if (notAllowed) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-hero text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl font-bold">Acesso Negado</h1>
            </div>
          </div>
        </section>
        <section className="section-light py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <p className="text-muted-foreground mb-6">
                  Você não tem permissão para visualizar esta proposta.
                </p>
                <Link href="/minhas-propostas">
                  <Button>Ver Minhas Propostas</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  if (!proposal) {
    return null
  }

  const isBuyer = proposal.buyer_pf_id === user.id
  const isSeller = proposal.cota?.seller_id === user.id

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link
              href={isBuyer ? '/minhas-propostas' : '/minhas-cotas'}
              className="inline-flex items-center text-sm text-white/80 hover:text-white mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {isBuyer ? 'Voltar para Minhas Propostas' : 'Voltar para Minhas Cotas'}
            </Link>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8" />
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {proposal.cota?.administrator}
                  </h1>
                </div>
                <p className="text-lg text-white/90">
                  {isBuyer ? 'Sua proposta de compra' : 'Proposta recebida'}
                </p>
              </div>
              <Badge
                variant={getStatusBadgeVariant(proposal.status)}
                className="text-sm px-4 py-2 w-fit"
              >
                {getProposalStatusLabel(proposal.status)}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Status Card */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(proposal.status)}
                      Status da Proposta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {getStatusDescription(proposal.status)}
                    </p>

                    {proposal.status === 'REJECTED' && proposal.rejection_reason && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-800 mb-1">Motivo da Rejeição</p>
                            <p className="text-sm text-red-700">{proposal.rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {proposal.transfer_fee && proposal.transfer_fee > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Taxa de Transferência:</strong> {formatCurrency(proposal.transfer_fee)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cota Details */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle>Detalhes da Cota</CardTitle>
                    <CardDescription>
                      <Badge variant={getCotaStatusBadgeVariant(proposal.cota.status)}>
                        {getCotaStatusLabel(proposal.cota.status)}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Valor do Crédito</p>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(proposal.cota.credit_amount)}
                        </p>
                      </div>
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Entrada</p>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(proposal.cota.entry_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(proposal.cota.entry_percentage)} do crédito
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Saldo Devedor</span>
                        <span className="font-semibold">{formatCurrency(proposal.cota.outstanding_balance)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Parcelas</span>
                        <span className="font-semibold">{proposal.cota.n_installments}x de {formatCurrency(proposal.cota.installment_value)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Taxa Mensal</span>
                        <span className="font-semibold">
                          {proposal.cota.monthly_rate ? formatPercentage(proposal.cota.monthly_rate, 4) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Link href={`/cota/${proposal.cota.id}`}>
                        <Button variant="outline" size="sm">
                          Ver Cota Completa
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Buyer Info (visible to seller) */}
                {isSeller && buyerEntity && (
                  <Card className="bg-white shadow-lg border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {proposal.buyer_type === 'PF' ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <Briefcase className="h-5 w-5" />
                        )}
                        {proposal.buyer_type === 'PF' ? 'Comprador (Pessoa Física)' : 'Comprador (Pessoa Jurídica)'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {proposal.buyer_type === 'PF' && 'full_name' in buyerEntity && (
                        <div className="space-y-2">
                          <p><strong>Nome:</strong> {buyerEntity.full_name}</p>
                        </div>
                      )}
                      {proposal.buyer_type === 'PJ' && 'legal_name' in buyerEntity && (
                        <div className="space-y-2">
                          <p><strong>Razão Social:</strong> {buyerEntity.legal_name}</p>
                          <p><strong>CNPJ:</strong> {buyerEntity.cnpj}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* History Timeline */}
                {history.length > 0 && (
                  <Card className="bg-white shadow-lg border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Histórico da Proposta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                        <div className="space-y-6">
                          {history.map((item, index) => (
                            <div key={item.id} className="relative pl-10">
                              {/* Timeline dot */}
                              <div className={`absolute left-2.5 w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-primary' : 'bg-gray-300'
                              }`} />

                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={getStatusBadgeVariant(item.new_status)} className="text-xs">
                                    {getProposalStatusLabel(item.new_status)}
                                  </Badge>
                                  {item.old_status && (
                                    <span className="text-xs text-muted-foreground">
                                      (anterior: {getProposalStatusLabel(item.old_status)})
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(item.changed_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                {item.notes && (
                                  <p className="text-sm mt-2">{item.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Info Card */}
                <Card className="bg-white shadow-lg border-0 sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-base">Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Comprador</p>
                      <p className="font-medium">
                        {proposal.buyer_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm text-muted-foreground">Data da Proposta</p>
                      <p className="font-medium">
                        {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {proposal.updated_at !== proposal.created_at && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">Última Atualização</p>
                          <p className="font-medium">
                            {new Date(proposal.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </>
                    )}

                    {proposal.group_id && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">Grupo de Propostas</p>
                          <p className="font-medium text-xs break-all">
                            {proposal.group_id}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Help Card */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-base">Precisa de Ajuda?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Entre em contato conosco para dúvidas sobre esta proposta.
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:contato@consorciomarket.com.br">
                        Entrar em Contato
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
