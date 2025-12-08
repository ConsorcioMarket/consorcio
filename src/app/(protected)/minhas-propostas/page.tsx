'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Eye, AlertCircle } from 'lucide-react'
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

export default function MinhasPropostasPage() {
  const router = useRouter()
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
    }
  }, [user, supabase])

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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-primary-darker">
                    Suas Propostas
                  </h2>
                  <p className="text-muted-foreground">
                    {proposals.length} {proposals.length === 1 ? 'proposta' : 'propostas'} no total
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline">
                    Ver Cotas Disponíveis
                  </Button>
                </Link>
              </div>

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
                  <Link href="/">
                    <Button>Ver Cotas Disponíveis</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Administradora</TableHead>
                        <TableHead>Crédito</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposals.map((proposal) => (
                        <TableRow key={proposal.id}>
                          <TableCell className="font-medium">
                            {proposal.cota?.administrator || '-'}
                          </TableCell>
                          <TableCell>
                            {proposal.cota ? formatCurrency(proposal.cota.credit_amount) : '-'}
                          </TableCell>
                          <TableCell>
                            {proposal.cota ? formatCurrency(proposal.cota.entry_amount) : '-'}
                          </TableCell>
                          <TableCell>
                            {proposal.cota?.n_installments}x
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {proposal.buyer_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(proposal.status)}>
                              {getProposalStatusLabel(proposal.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/proposta/${proposal.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Status Legend */}
              {proposals.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h4 className="font-medium mb-3">Legenda de Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" className="text-xs">Em Análise</Badge>
                      <span className="text-muted-foreground">Aguardando</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">Pré-Aprovada</Badge>
                      <span className="text-muted-foreground">Docs pendentes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-xs">Aprovada</Badge>
                      <span className="text-muted-foreground">Aguardando pagamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">Transferência</Badge>
                      <span className="text-muted-foreground">Em andamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-xs">Concluída</Badge>
                      <span className="text-muted-foreground">Finalizada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">Rejeitada</Badge>
                      <span className="text-muted-foreground">Não aprovada</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Reasons */}
              {proposals.some(p => p.status === 'REJECTED' && p.rejection_reason) && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Propostas Rejeitadas</h4>
                      {proposals
                        .filter(p => p.status === 'REJECTED' && p.rejection_reason)
                        .map(p => (
                          <div key={p.id} className="text-sm text-red-700 mb-1">
                            <strong>{p.cota?.administrator}:</strong> {p.rejection_reason}
                          </div>
                        ))}
                    </div>
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
