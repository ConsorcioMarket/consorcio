'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Building2, CheckCircle, AlertTriangle, X, CheckCircle2, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { Cota, ProfilePJ, BuyerType } from '@/types/database'

function ComposicaoCreditoContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const cotaIdParam = searchParams.get('cota')
  const { addToast } = useToast()

  const { user, profile, loading: authLoading } = useAuth()
  const { items: cartItems, totals: cartTotals, removeItem, clearCart } = useCart()

  // Single cota state (when coming from URL param)
  const [singleCota, setSingleCota] = useState<Cota | null>(null)
  const [loadingCota, setLoadingCota] = useState(!!cotaIdParam)

  const [companies, setCompanies] = useState<ProfilePJ[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  // Form state
  const [buyerType, setBuyerType] = useState<BuyerType>('PF')
  const [selectedPJId, setSelectedPJId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  // Determine the cotas to use (cart or single)
  const cotas = cotaIdParam && singleCota ? [singleCota] : cartItems
  const isMultiCota = cotas.length > 1
  const hasCotas = cotas.length > 0

  // Calculate totals
  const totals = cotaIdParam && singleCota
    ? {
        totalCredit: singleCota.credit_amount,
        totalEntry: singleCota.entry_amount,
        totalBalance: singleCota.outstanding_balance,
        combinedEntryPercentage: singleCota.entry_percentage,
        itemCount: 1,
      }
    : cartTotals

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = cotaIdParam
        ? `/composicao-credito?cota=${cotaIdParam}`
        : '/composicao-credito'
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    }
  }, [user, authLoading, router, cotaIdParam])

  // Fetch single cota details (if URL param)
  useEffect(() => {
    const fetchCota = async () => {
      if (!cotaIdParam) {
        setLoadingCota(false)
        return
      }

      setLoadingCota(true)
      try {
        const { data, error } = await supabase
          .from('cotas')
          .select('*')
          .eq('id', cotaIdParam)
          .single()

        if (error || !data) {
          console.error('Error fetching cota:', error)
          router.push('/')
          return
        }

        setSingleCota(data)
      } catch (err) {
        console.error('Error fetching cota:', err)
        router.push('/')
      } finally {
        setLoadingCota(false)
      }
    }

    fetchCota()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotaIdParam])

  // Fetch user's companies
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) return

      setLoadingCompanies(true)
      try {
        const { data, error } = await supabase
          .from('profiles_pj')
          .select('*')
          .eq('pf_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching companies:', error)
        } else {
          setCompanies(data || [])
        }
      } catch (err) {
        console.error('Error fetching companies:', err)
      } finally {
        setLoadingCompanies(false)
      }
    }

    if (user) {
      fetchCompanies()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pathname])

  const handleSubmit = async () => {
    if (!user || cotas.length === 0) return

    // Validation
    if (buyerType === 'PJ' && !selectedPJId) {
      setError('Por favor, selecione uma empresa para continuar.')
      return
    }

    // Check if user is trying to buy their own cota
    const ownCota = cotas.find(c => c.seller_id === user.id)
    if (ownCota) {
      setError('Você não pode comprar sua própria cota.')
      return
    }

    // Check if all cotas are available
    const unavailableCota = cotas.find(c => c.status !== 'AVAILABLE')
    if (unavailableCota) {
      setError('Uma ou mais cotas não estão mais disponíveis para propostas.')
      return
    }

    setError(null)
    setSubmitting(true)

    // Generate group_id for multi-cota purchases
    const groupId = isMultiCota ? crypto.randomUUID() : null
    const buyerEntityId = buyerType === 'PF' ? user.id : selectedPJId

    try {
      // Create proposals for each cota
      const now = new Date().toISOString()
      const proposals = cotas.map(cota => ({
        id: crypto.randomUUID(),
        cota_id: cota.id,
        buyer_pf_id: user.id,
        buyer_type: buyerType,
        buyer_entity_id: buyerEntityId,
        group_id: groupId,
        status: 'UNDER_REVIEW' as const,
        created_at: now,
        updated_at: now,
      }))

      const { error: insertError } = await supabase
        .from('proposals')
        .insert(proposals)
        .select()

      if (insertError) {
        console.error('Error creating proposals:', insertError)
        if (insertError.code === '23505') {
          setError('Você já possui uma proposta para uma ou mais destas cotas.')
        } else {
          setError('Erro ao criar proposta. Por favor, tente novamente.')
        }
        setSubmitting(false)
        return
      }

      // Clear cart if we used cart items
      if (!cotaIdParam) {
        clearCart()
      }

      setSuccess(true)
      setSubmitting(false)
      addToast({
        title: isMultiCota ? 'Propostas enviadas com sucesso!' : 'Proposta enviada com sucesso!',
        description: 'Você será notificado quando houver atualizações.',
        variant: 'success',
      })
    } catch (err) {
      console.error('Error:', err)
      setError('Erro ao criar proposta. Por favor, tente novamente.')
      setSubmitting(false)
    }
  }

  if (authLoading || loadingCota) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // No cotas selected
  if (!hasCotas) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-hero text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Composição de Crédito
              </h1>
            </div>
          </div>
        </section>

        <section className="section-light py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-xl font-bold mb-3">Nenhuma cota selecionada</h2>
                <p className="text-muted-foreground mb-6">
                  Adicione cotas à sua composição para fazer uma proposta.
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

  // Check if user is the seller of any cota
  const isSeller = cotas.some(c => c.seller_id === user.id)

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-hero text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                {isMultiCota ? 'Propostas Enviadas!' : 'Proposta Enviada!'}
              </h1>
            </div>
          </div>
        </section>

        <section className="section-light py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-primary-darker mb-3">
                  {isMultiCota
                    ? `${cotas.length} propostas enviadas com sucesso!`
                    : 'Sua proposta foi enviada com sucesso!'}
                </h2>

                <p className="text-muted-foreground mb-8">
                  Nossa equipe irá analisar {isMultiCota ? 'suas propostas' : 'sua proposta'} e entrará em contato em breve.
                  Você pode acompanhar o status na página &quot;Minhas Propostas&quot;.
                </p>

                <div className="space-y-3">
                  <Link href="/minhas-propostas">
                    <Button className="w-full">Ver Minhas Propostas</Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline" className="w-full">
                      Voltar ao Início
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-hero text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {isMultiCota ? 'Composição de Crédito' : 'Fazer Proposta'}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              {isMultiCota
                ? `${cotas.length} cotas selecionadas`
                : 'Confirme os dados e envie sua proposta'}
            </p>

            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-3 pt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 text-green-300" />
                <span className="text-white/80">1. Cotas</span>
              </div>
              <div className="w-8 h-px bg-white/40" />
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-bold">2</span>
                </div>
                <span className="text-white font-medium">2. Comprador</span>
              </div>
              <div className="w-8 h-px bg-white/40" />
              <div className="flex items-center gap-1.5">
                <Circle className="h-5 w-5 text-white/50" />
                <span className="text-white/50">3. Enviar</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar para Cotas
            </Link>

            {isSeller ? (
              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="h-10 w-10 text-yellow-600" />
                  </div>

                  <h2 className="text-2xl font-bold text-primary-darker mb-3">
                    Cota própria detectada
                  </h2>

                  <p className="text-muted-foreground mb-8">
                    Você não pode fazer uma proposta para sua própria cota.
                    {isMultiCota && ' Remova suas cotas da composição para continuar.'}
                  </p>

                  <Link href="/">
                    <Button>Ver Outras Cotas</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Cotas Summary */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle>
                      {isMultiCota ? 'Cotas da Composição' : 'Resumo da Cota'}
                    </CardTitle>
                    {isMultiCota && (
                      <CardDescription>
                        Todas as cotas devem ser da mesma administradora: {cotas[0].administrator}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Individual cotas list */}
                    <div className="space-y-3 mb-6">
                      {cotas.map((cota, index) => (
                        <div
                          key={cota.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isMultiCota && (
                                <Badge variant="outline" className="text-xs">
                                  #{index + 1}
                                </Badge>
                              )}
                              <span className="font-medium">{cota.administrator}</span>
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>Crédito: {formatCurrency(cota.credit_amount)}</span>
                              <span>Entrada: {formatCurrency(cota.entry_amount)}</span>
                            </div>
                          </div>
                          {isMultiCota && !cotaIdParam && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(cota.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Totals */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Crédito Total</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(totals.totalCredit)}
                        </p>
                      </div>
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Entrada Total</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(totals.totalEntry)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">% Entrada</p>
                        <p className="text-lg font-bold">
                          {formatPercentage(totals.combinedEntryPercentage)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(totals.totalBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        Valores exatos serão confirmados após análise e envio do extrato atualizado pelo vendedor.
                        {isMultiCota && ' As propostas serão agrupadas e só poderão ser pagas quando todas forem aprovadas.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Buyer Selection */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader>
                    <CardTitle>Quem será o comprador?</CardTitle>
                    <CardDescription>
                      Selecione se a compra será em nome de pessoa física ou jurídica
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* PF Option */}
                      <button
                        type="button"
                        onClick={() => setBuyerType('PF')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          buyerType === 'PF'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-full ${
                            buyerType === 'PF' ? 'bg-primary text-white' : 'bg-gray-100'
                          }`}>
                            <User className="h-5 w-5" />
                          </div>
                          <span className="font-semibold">Pessoa Física</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Comprar em meu nome ({profile?.full_name})
                        </p>
                      </button>

                      {/* PJ Option */}
                      <button
                        type="button"
                        onClick={() => setBuyerType('PJ')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          buyerType === 'PJ'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-full ${
                            buyerType === 'PJ' ? 'bg-primary text-white' : 'bg-gray-100'
                          }`}>
                            <Building2 className="h-5 w-5" />
                          </div>
                          <span className="font-semibold">Pessoa Jurídica</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Comprar em nome de uma empresa
                        </p>
                      </button>
                    </div>

                    {/* PJ Selection */}
                    {buyerType === 'PJ' && (
                      <div className="mt-6">
                        {loadingCompanies ? (
                          <p className="text-muted-foreground text-sm">Carregando empresas...</p>
                        ) : companies.length === 0 ? (
                          <div className="bg-muted/30 rounded-lg p-6 text-center">
                            <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground mb-4">
                              Você ainda não cadastrou nenhuma empresa.
                            </p>
                            <Link href="/meus-dados?tab=empresas">
                              <Button variant="outline" size="sm">
                                Cadastrar Empresa
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm font-medium">Selecione a empresa:</p>
                            {companies.map((company) => (
                              <button
                                key={company.id}
                                type="button"
                                onClick={() => setSelectedPJId(company.id)}
                                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                                  selectedPJId === company.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{company.legal_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      CNPJ: {company.cnpj}
                                    </p>
                                  </div>
                                  <Badge variant={company.status === 'APPROVED' ? 'success' : 'secondary'}>
                                    {company.status === 'APPROVED' ? 'Aprovada' : 'Pendente'}
                                  </Badge>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submit */}
                    <div className="mt-8 pt-6 border-t space-y-4">
                      {/* Warning when PJ is selected but no company chosen */}
                      {buyerType === 'PJ' && !selectedPJId && companies.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-sm text-amber-800">
                            Selecione uma empresa acima para continuar com a proposta.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button
                          variant="outline"
                          onClick={() => router.push('/')}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting || (buyerType === 'PJ' && !selectedPJId)}
                          className="flex-1"
                        >
                          {submitting
                            ? 'Enviando...'
                            : isMultiCota
                              ? `Enviar ${cotas.length} Propostas`
                              : 'Enviar Proposta'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function ComposicaoCreditoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    }>
      <ComposicaoCreditoContent />
    </Suspense>
  )
}
