'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatPercentage, getCotaStatusLabel } from '@/lib/utils'
import type { Cota, CotaStatus } from '@/types/database'

function getStatusBadgeVariant(status: CotaStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<CotaStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    AVAILABLE: 'success',
    RESERVED: 'warning',
    SOLD: 'secondary',
    REMOVED: 'destructive',
  }
  return variants[status] || 'outline'
}

export default function CotaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [cota, setCota] = useState<Cota | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const supabase = createClient()

  // Fetch cota data
  useEffect(() => {
    const fetchCota = async () => {
      if (!id) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setCota(data)
      setLoading(false)
    }

    fetchCota()
  }, [id, supabase])

  const handleInterest = () => {
    if (!user) {
      localStorage.setItem('pendingCotaId', id)
      router.push(`/login?returnUrl=${encodeURIComponent('/composicao-credito?cota=' + id)}`)
    } else {
      router.push(`/composicao-credito?cota=${id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (notFound || !cota) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-hero text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl font-bold">Cota não encontrada</h1>
            </div>
          </div>
        </section>
        <section className="section-light py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-muted-foreground mb-6">
                  A cota que você está procurando não foi encontrada ou não está mais disponível.
                </p>
                <Link href="/">
                  <Button>Ver Cotas Disponíveis</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  const isMine = user?.id === cota.seller_id
  const isReserved = cota.status === 'RESERVED'
  const isSold = cota.status === 'SOLD'
  const canPropose = !isMine && !isReserved && !isSold && cota.status === 'AVAILABLE'

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-white/80 hover:text-white mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar para Cotas
            </Link>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8" />
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {cota.administrator}
                  </h1>
                </div>
                <p className="text-lg text-white/90">
                  Cota de consórcio contemplada
                </p>
              </div>
              <Badge
                variant={getStatusBadgeVariant(cota.status)}
                className="text-sm px-4 py-2 w-fit"
              >
                {getCotaStatusLabel(cota.status)}
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
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Key Values */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle>Valores Principais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Valor do Crédito</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(cota.credit_amount)}
                        </p>
                      </div>
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Entrada</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(cota.entry_amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatPercentage(cota.entry_percentage)} do crédito
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Details */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle>Detalhes Financeiros</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Saldo Devedor</span>
                      <span className="font-semibold">{formatCurrency(cota.outstanding_balance)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Número de Parcelas</span>
                      <span className="font-semibold">{cota.n_installments}x</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Valor da Parcela</span>
                      <span className="font-semibold">{formatCurrency(cota.installment_value)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">% Entrada</span>
                      <span className="font-semibold">{formatPercentage(cota.entry_percentage)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Taxa Mensal</span>
                      <span className="font-semibold">
                        {cota.monthly_rate ? formatPercentage(cota.monthly_rate, 4) : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Disclaimer */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 mb-1">Importante</p>
                    <p className="text-sm text-yellow-700">
                      Os valores exatos serão confirmados após o vendedor enviar o extrato
                      atualizado do consórcio. Pequenas variações podem ocorrer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Action Card */}
                <Card className="bg-white shadow-lg border-0 sticky top-24">
                  <CardHeader>
                    <CardTitle>Interessado?</CardTitle>
                    <CardDescription>
                      Faça uma proposta para esta cota
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {canPropose && (
                      <Button onClick={handleInterest} size="lg" className="w-full">
                        Tenho Interesse
                      </Button>
                    )}

                    {isMine && (
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-3">
                          Esta é a sua cota
                        </p>
                        <Link href={`/editar-cota/${cota.id}`}>
                          <Button variant="outline" className="w-full">
                            Editar Cota
                          </Button>
                        </Link>
                      </div>
                    )}

                    {isReserved && !isMine && (
                      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Esta cota está reservada e não aceita novas propostas no momento.
                        </p>
                      </div>
                    )}

                    {isSold && (
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Esta cota já foi vendida.
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        <strong>Publicada em:</strong>{' '}
                        {new Date(cota.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {cota.updated_at !== cota.created_at && (
                        <p>
                          <strong>Atualizada em:</strong>{' '}
                          {new Date(cota.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Help Card */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-base">Dúvidas?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Entre em contato conosco para mais informações sobre esta cota.
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
