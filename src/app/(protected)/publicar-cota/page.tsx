'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calculator, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { calculateEntryPercentage, calculateMonthlyRate, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

// Common administrators list
const ADMINISTRATORS = [
  'Bradesco Consórcios',
  'Itaú Consórcios',
  'Caixa Consórcios',
  'Santander Consórcios',
  'BB Consórcios',
  'Porto Seguro Consórcios',
  'Rodobens Consórcios',
  'Embracon',
  'Magalu Consórcios',
  'Consórcio Nacional Honda',
  'Consórcio Volkswagen',
  'Consórcio Fiat',
  'Consórcio GM (Chevrolet)',
  'Outra',
]

// Parse currency input
function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Format currency input
function formatCurrencyInput(value: string): string {
  const num = parseCurrency(value)
  if (isNaN(num) || num === 0) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export default function PublicarCotaPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [success, setSuccess] = useState(false)
  const [newCotaId, setNewCotaId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Form state
  const [form, setForm] = useState({
    administrator: '',
    otherAdministrator: '',
    creditAmount: '',
    outstandingBalance: '',
    nInstallments: '',
    installmentValue: '',
    entryAmount: '',
  })

  // Calculated values
  const [calculations, setCalculations] = useState({
    entryPercentage: 0,
    monthlyRate: 0,
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/publicar-cota')
    }
  }, [user, authLoading, router])

  // Recalculate when values change
  useEffect(() => {
    const creditAmount = parseCurrency(form.creditAmount)
    const entryAmount = parseCurrency(form.entryAmount)
    const outstandingBalance = parseCurrency(form.outstandingBalance)
    const installmentValue = parseCurrency(form.installmentValue)
    const nInstallments = parseInt(form.nInstallments) || 0

    // Calculate entry percentage
    const entryPercentage = calculateEntryPercentage(entryAmount, creditAmount)

    // Calculate monthly rate (if we have the required values)
    let monthlyRate = 0
    if (nInstallments > 0 && installmentValue > 0 && outstandingBalance > 0) {
      try {
        monthlyRate = calculateMonthlyRate(
          nInstallments,
          -installmentValue,
          outstandingBalance,
          0,
          0,
          0.01
        )
        // Handle negative or invalid rates
        if (monthlyRate < 0 || !isFinite(monthlyRate)) {
          monthlyRate = 0
        }
      } catch {
        monthlyRate = 0
      }
    }

    setCalculations({
      entryPercentage,
      monthlyRate,
    })
  }, [form.creditAmount, form.entryAmount, form.outstandingBalance, form.installmentValue, form.nInstallments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError(null)
    setSaving(true)

    // Validation
    const creditAmount = parseCurrency(form.creditAmount)
    const outstandingBalance = parseCurrency(form.outstandingBalance)
    const entryAmount = parseCurrency(form.entryAmount)
    const installmentValue = parseCurrency(form.installmentValue)
    const nInstallments = parseInt(form.nInstallments) || 0
    const administrator = form.administrator === 'Outra'
      ? form.otherAdministrator
      : form.administrator

    if (!administrator) {
      setError('Por favor, selecione ou informe a administradora.')
      setSaving(false)
      return
    }

    if (creditAmount <= 0) {
      setError('O valor do crédito deve ser maior que zero.')
      setSaving(false)
      return
    }

    if (entryAmount <= 0) {
      setError('O valor da entrada deve ser maior que zero.')
      setSaving(false)
      return
    }

    if (nInstallments <= 0) {
      setError('O número de parcelas deve ser maior que zero.')
      setSaving(false)
      return
    }

    // Insert cota
    const { data, error: insertError } = await supabase
      .from('cotas')
      .insert({
        seller_id: user.id,
        administrator,
        credit_amount: creditAmount,
        outstanding_balance: outstandingBalance,
        n_installments: nInstallments,
        installment_value: installmentValue,
        entry_amount: entryAmount,
        entry_percentage: calculations.entryPercentage,
        monthly_rate: calculations.monthlyRate > 0 ? calculations.monthlyRate : null,
        status: 'AVAILABLE',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating cota:', insertError)
      setError('Erro ao publicar cota. Por favor, tente novamente.')
      setSaving(false)
      return
    }

    setNewCotaId(data.id)
    setSuccess(true)
    setSaving(false)
    addToast({
      title: 'Cota publicada com sucesso!',
      description: 'Sua cota já está disponível para visualização.',
      variant: 'success',
    })
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

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-hero text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Cota Publicada!
              </h1>
            </div>
          </div>
        </section>

        {/* Success Content */}
        <section className="section-light py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-primary-darker mb-3">
                  Sua cota foi publicada com sucesso!
                </h2>

                <p className="text-muted-foreground mb-8">
                  Sua cota já está disponível para compradores interessados.
                  Você pode gerenciá-la na página &quot;Minhas Cotas&quot;.
                </p>

                <div className="space-y-3">
                  <Link href="/minhas-cotas">
                    <Button className="w-full">Ver Minhas Cotas</Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSuccess(false)
                      setNewCotaId(null)
                      setForm({
                        administrator: '',
                        otherAdministrator: '',
                        creditAmount: '',
                        outstandingBalance: '',
                        nInstallments: '',
                        installmentValue: '',
                        entryAmount: '',
                      })
                    }}
                  >
                    Publicar Outra Cota
                  </Button>
                  <Link href="/">
                    <Button variant="ghost" className="w-full">
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
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Publicar Cota
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Anuncie sua cota de consórcio contemplada
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Link
              href="/minhas-cotas"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar para Minhas Cotas
            </Link>

            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle>Dados da Cota</CardTitle>
                <CardDescription>
                  Preencha as informações da sua cota de consórcio contemplada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Administrator */}
                  <div className="space-y-2">
                    <Label htmlFor="administrator">Administradora *</Label>
                    <select
                      id="administrator"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={form.administrator}
                      onChange={(e) => setForm({ ...form, administrator: e.target.value })}
                      required
                    >
                      <option value="">Selecione a administradora</option>
                      {ADMINISTRATORS.map((admin) => (
                        <option key={admin} value={admin}>
                          {admin}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.administrator === 'Outra' && (
                    <div className="space-y-2">
                      <Label htmlFor="otherAdministrator">Nome da Administradora *</Label>
                      <Input
                        id="otherAdministrator"
                        placeholder="Digite o nome da administradora"
                        value={form.otherAdministrator}
                        onChange={(e) => setForm({ ...form, otherAdministrator: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {/* Credit Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="creditAmount">Valor do Crédito (R$) *</Label>
                    <Input
                      id="creditAmount"
                      placeholder="Ex: 200.000,00"
                      value={form.creditAmount}
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value)
                        setForm({ ...form, creditAmount: formatted })
                      }}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor total da carta de crédito
                    </p>
                  </div>

                  {/* Entry Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="entryAmount">Valor da Entrada (R$) *</Label>
                    <Input
                      id="entryAmount"
                      placeholder="Ex: 50.000,00"
                      value={form.entryAmount}
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value)
                        setForm({ ...form, entryAmount: formatted })
                      }}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor que o comprador precisa pagar de entrada
                    </p>
                  </div>

                  {/* Outstanding Balance */}
                  <div className="space-y-2">
                    <Label htmlFor="outstandingBalance">Saldo Devedor (R$) *</Label>
                    <Input
                      id="outstandingBalance"
                      placeholder="Ex: 150.000,00"
                      value={form.outstandingBalance}
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value)
                        setForm({ ...form, outstandingBalance: formatted })
                      }}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor restante a ser pago em parcelas
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Number of Installments */}
                    <div className="space-y-2">
                      <Label htmlFor="nInstallments">Número de Parcelas *</Label>
                      <Input
                        id="nInstallments"
                        type="number"
                        min="1"
                        max="999"
                        placeholder="Ex: 180"
                        value={form.nInstallments}
                        onChange={(e) => setForm({ ...form, nInstallments: e.target.value })}
                        required
                      />
                    </div>

                    {/* Installment Value */}
                    <div className="space-y-2">
                      <Label htmlFor="installmentValue">Valor da Parcela (R$) *</Label>
                      <Input
                        id="installmentValue"
                        placeholder="Ex: 1.200,00"
                        value={form.installmentValue}
                        onChange={(e) => {
                          const formatted = formatCurrencyInput(e.target.value)
                          setForm({ ...form, installmentValue: formatted })
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Calculated Values */}
                  {(calculations.entryPercentage > 0 || calculations.monthlyRate > 0) && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calculator className="h-4 w-4" />
                        Valores Calculados
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">% Entrada</p>
                          <p className="font-semibold text-lg">
                            {calculations.entryPercentage.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Taxa Mensal</p>
                          <p className="font-semibold text-lg">
                            {calculations.monthlyRate > 0
                              ? `${calculations.monthlyRate.toFixed(4)}%`
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {parseCurrency(form.creditAmount) > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Preview do anúncio:</p>
                      <p className="text-sm">
                        <strong>
                          {form.administrator === 'Outra'
                            ? form.otherAdministrator || 'Administradora'
                            : form.administrator || 'Administradora'}
                        </strong>{' '}
                        - Crédito de{' '}
                        <strong>{formatCurrency(parseCurrency(form.creditAmount))}</strong>
                        {parseCurrency(form.entryAmount) > 0 && (
                          <>
                            {' '}com entrada de{' '}
                            <strong>{formatCurrency(parseCurrency(form.entryAmount))}</strong>
                            {calculations.entryPercentage > 0 && (
                              <span className="text-muted-foreground">
                                {' '}({calculations.entryPercentage.toFixed(1)}%)
                              </span>
                            )}
                          </>
                        )}
                        {form.nInstallments && (
                          <>
                            {' '}em <strong>{form.nInstallments}x</strong>
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/minhas-cotas')}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving} className="flex-1">
                      {saving ? 'Publicando...' : 'Publicar Cota'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
