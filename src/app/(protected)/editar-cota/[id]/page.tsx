'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calculator, CheckCircle, AlertTriangle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { calculateEntryPercentage, calculateMonthlyRate, formatCurrency } from '@/lib/utils'
import { DocumentUpload } from '@/components/DocumentUpload'
import type { Cota, Document } from '@/types/database'

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
function formatCurrencyInput(value: string | number): string {
  const num = typeof value === 'number' ? value : parseCurrency(value)
  if (isNaN(num) || num === 0) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export default function EditarCotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const [cota, setCota] = useState<Cota | null>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [notAllowed, setNotAllowed] = useState(false)
  const [statementDocument, setStatementDocument] = useState<Document | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)

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

  // Calculated values (derived from form state)
  const calculations = useMemo(() => {
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

    return { entryPercentage, monthlyRate }
  }, [form.creditAmount, form.entryAmount, form.outstandingBalance, form.installmentValue, form.nInstallments])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?returnUrl=/editar-cota/${id}`)
    }
  }, [user, authLoading, router, id])

  // Fetch cota data
  useEffect(() => {
    const fetchCota = async () => {
      if (!user || !id) return

      setLoading(true)
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

      // Check if user is the owner
      if (data.seller_id !== user.id) {
        setNotAllowed(true)
        setLoading(false)
        return
      }

      // Check if cota can be edited (only AVAILABLE)
      if (data.status !== 'AVAILABLE') {
        setNotAllowed(true)
        setLoading(false)
        return
      }

      setCota(data)

      // Fetch cota statement document if exists
      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', id)
        .eq('owner_type', 'COTA')
        .eq('document_type', 'COTA_STATEMENT')
        .single()

      if (docData) {
        setStatementDocument(docData)
      }

      // Check if administrator is in the list or custom
      const isKnownAdmin = ADMINISTRATORS.includes(data.administrator)

      // Initialize form with cota data
      setForm({
        administrator: isKnownAdmin ? data.administrator : 'Outra',
        otherAdministrator: isKnownAdmin ? '' : data.administrator,
        creditAmount: formatCurrencyInput(data.credit_amount),
        outstandingBalance: formatCurrencyInput(data.outstanding_balance),
        nInstallments: String(data.n_installments),
        installmentValue: formatCurrencyInput(data.installment_value),
        entryAmount: formatCurrencyInput(data.entry_amount),
      })

      setLoading(false)
    }

    if (user) {
      fetchCota()
    }
  }, [user, id, pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !cota) return

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

    // Update cota
    const { error: updateError } = await supabase
      .from('cotas')
      .update({
        administrator,
        credit_amount: creditAmount,
        outstanding_balance: outstandingBalance,
        n_installments: nInstallments,
        installment_value: installmentValue,
        entry_amount: entryAmount,
        entry_percentage: calculations.entryPercentage,
        monthly_rate: calculations.monthlyRate > 0 ? calculations.monthlyRate : null,
      })
      .eq('id', cota.id)

    if (updateError) {
      console.error('Error updating cota:', updateError)
      setError('Erro ao atualizar cota. Por favor, tente novamente.')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
  }

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
                  A cota que você está tentando editar não foi encontrada.
                </p>
                <Link href="/minhas-cotas">
                  <Button>Voltar para Minhas Cotas</Button>
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
              <h1 className="text-4xl font-bold">Edição não permitida</h1>
            </div>
          </div>
        </section>
        <section className="section-light py-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-muted-foreground mb-6">
                  Você não pode editar esta cota. Apenas cotas com status &quot;Disponível&quot; podem ser editadas pelo proprietário.
                </p>
                <Link href="/minhas-cotas">
                  <Button>Voltar para Minhas Cotas</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-hero text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl font-bold">Cota Atualizada!</h1>
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
                  Sua cota foi atualizada com sucesso!
                </h2>
                <p className="text-muted-foreground mb-8">
                  As alterações já estão visíveis para os compradores.
                </p>
                <div className="space-y-3">
                  <Link href="/minhas-cotas">
                    <Button className="w-full">Ver Minhas Cotas</Button>
                  </Link>
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
              Editar Cota
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Atualize as informações da sua cota
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
                  Atualize as informações da sua cota de consórcio
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

                  {/* Statement Document Upload */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Extrato da Administradora</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Envie o extrato atualizado da sua cota emitido pela administradora. Este documento comprova os valores informados.
                    </p>

                    {documentError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                        {documentError}
                      </div>
                    )}

                    {cota && (
                      <DocumentUpload
                        ownerId={cota.id}
                        ownerType="COTA"
                        documentType="COTA_STATEMENT"
                        existingDocument={statementDocument}
                        onUploadComplete={(doc) => {
                          setStatementDocument(doc)
                          setDocumentError(null)
                        }}
                        onError={(err) => setDocumentError(err)}
                        accept=".pdf,.jpg,.jpeg,.png"
                        maxSizeMB={10}
                      />
                    )}
                  </div>

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
                      {saving ? 'Salvando...' : 'Salvar Alterações'}
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
