'use client'

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CreditCard,
  User,
  FileText,
  Edit,
  Save,
  X,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, getCotaStatusLabel, getDocumentStatusLabel, calculateMonthlyRate } from '@/lib/utils'
import type { CotaStatus, Document, DocumentStatus } from '@/types/database'

interface CotaDetail {
  id: string
  administrator: string
  credit_amount: number
  entry_amount: number
  entry_percentage: number
  outstanding_balance: number
  n_installments: number
  installment_value: number
  monthly_rate: number | null
  status: CotaStatus
  created_at: string
  updated_at: string
  seller: {
    id: string
    full_name: string
    email: string
    phone: string
  }
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

function getDocStatusBadgeVariant(status: DocumentStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<DocumentStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    PENDING_UPLOAD: 'secondary',
    UNDER_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
  }
  return variants[status] || 'outline'
}

const STATUS_OPTIONS: { value: CotaStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'RESERVED', label: 'Reservada' },
  { value: 'SOLD', label: 'Vendida' },
  { value: 'REMOVED', label: 'Removida' },
]

// Parse currency input
function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Format currency input
function formatCurrencyInput(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function AdminCotaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cota, setCota] = useState<CotaDetail | null>(null)
  const [statement, setStatement] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    creditAmount: '',
    entryAmount: '',
    outstandingBalance: '',
    nInstallments: '',
    installmentValue: '',
  })

  // Status change state
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Calculate derived values in real-time
  // Formula: RATE(n_installments, -installment_value, credit_amount - entry_amount)
  const calculatedValues = useMemo(() => {
    const creditAmount = parseCurrency(editForm.creditAmount)
    const entryAmount = parseCurrency(editForm.entryAmount)
    const nInstallments = parseInt(editForm.nInstallments) || 0
    const installmentValue = parseCurrency(editForm.installmentValue)
    const presentValue = creditAmount - entryAmount

    const entryPercentage = creditAmount > 0 ? (entryAmount / creditAmount) * 100 : 0
    const monthlyRate = nInstallments > 0 && installmentValue > 0 && presentValue > 0
      ? calculateMonthlyRate(nInstallments, -installmentValue, presentValue)
      : 0

    return { entryPercentage, monthlyRate }
  }, [editForm])

  useEffect(() => {
    const fetchCota = async () => {
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('cotas')
        .select(`
          *,
          seller:profiles_pf!cotas_seller_id_fkey(id, full_name, email, phone)
        `)
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        console.error('Error fetching cota:', fetchError)
        setLoading(false)
        return
      }

      const cotaData: CotaDetail = {
        ...data,
        credit_amount: Number(data.credit_amount),
        entry_amount: Number(data.entry_amount),
        entry_percentage: Number(data.entry_percentage),
        outstanding_balance: Number(data.outstanding_balance),
        installment_value: Number(data.installment_value),
        monthly_rate: data.monthly_rate ? Number(data.monthly_rate) : null,
        seller: Array.isArray(data.seller) ? data.seller[0] : data.seller,
      }

      setCota(cotaData)

      // Initialize edit form
      setEditForm({
        creditAmount: formatCurrencyInput(cotaData.credit_amount),
        entryAmount: formatCurrencyInput(cotaData.entry_amount),
        outstandingBalance: formatCurrencyInput(cotaData.outstanding_balance),
        nInstallments: String(cotaData.n_installments),
        installmentValue: formatCurrencyInput(cotaData.installment_value),
      })

      // Fetch statement document
      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', id)
        .eq('owner_type', 'COTA')
        .eq('document_type', 'COTA_STATEMENT')
        .maybeSingle()

      if (docData) {
        // Generate signed URL for the document
        const bucketName = 'documents-cota'
        const regex = new RegExp(`${bucketName}/(.+)$`)
        const match = docData.file_url.match(regex)
        const filePath = match ? match[1] : ''

        if (filePath) {
          const { data: signedUrlData } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600) // 1 hour expiration

          if (signedUrlData?.signedUrl) {
            setStatement({ ...docData, file_url: signedUrlData.signedUrl })
          } else {
            setStatement(docData)
          }
        } else {
          setStatement(docData)
        }
      }

      setLoading(false)
    }

    fetchCota()
  }, [id, supabase])

  const handleSaveAdjustments = async () => {
    if (!cota) return

    setError(null)
    setSuccess(null)
    setSaving(true)

    const creditAmount = parseCurrency(editForm.creditAmount)
    const entryAmount = parseCurrency(editForm.entryAmount)
    const outstandingBalance = parseCurrency(editForm.outstandingBalance)
    const nInstallments = parseInt(editForm.nInstallments) || 0
    const installmentValue = parseCurrency(editForm.installmentValue)
    const presentValue = creditAmount - entryAmount

    // Validation
    if (creditAmount <= 0 || entryAmount <= 0 || nInstallments <= 0) {
      setError('Todos os valores devem ser maiores que zero.')
      setSaving(false)
      return
    }

    // Calculate new entry percentage
    const entryPercentage = creditAmount > 0 ? (entryAmount / creditAmount) * 100 : 0

    // Calculate monthly rate using RATE formula: RATE(n_installments, -installment_value, credit_amount - entry_amount)
    const monthlyRate = calculateMonthlyRate(nInstallments, -installmentValue, presentValue)

    // Get current user for history tracking
    const { data: { user } } = await supabase.auth.getUser()

    // Track changes in cota_history
    const changes: { field: string; oldValue: string; newValue: string }[] = []

    if (cota.credit_amount !== creditAmount) {
      changes.push({ field: 'credit_amount', oldValue: String(cota.credit_amount), newValue: String(creditAmount) })
    }
    if (cota.entry_amount !== entryAmount) {
      changes.push({ field: 'entry_amount', oldValue: String(cota.entry_amount), newValue: String(entryAmount) })
    }
    if (cota.outstanding_balance !== outstandingBalance) {
      changes.push({ field: 'outstanding_balance', oldValue: String(cota.outstanding_balance), newValue: String(outstandingBalance) })
    }
    if (cota.n_installments !== nInstallments) {
      changes.push({ field: 'n_installments', oldValue: String(cota.n_installments), newValue: String(nInstallments) })
    }
    if (cota.installment_value !== installmentValue) {
      changes.push({ field: 'installment_value', oldValue: String(cota.installment_value), newValue: String(installmentValue) })
    }

    const { error: updateError } = await supabase
      .from('cotas')
      .update({
        credit_amount: creditAmount,
        entry_amount: entryAmount,
        outstanding_balance: outstandingBalance,
        n_installments: nInstallments,
        installment_value: installmentValue,
        entry_percentage: entryPercentage,
        monthly_rate: monthlyRate,
      })
      .eq('id', cota.id)

    if (updateError) {
      console.error('Error updating cota:', updateError)
      setError('Erro ao salvar ajustes. Tente novamente.')
      setSaving(false)
      return
    }

    // Insert history records for each changed field
    if (changes.length > 0 && user) {
      const historyRecords = changes.map((change) => ({
        cota_id: cota.id,
        field_changed: change.field,
        old_value: change.oldValue,
        new_value: change.newValue,
        changed_by: user.id,
      }))

      await supabase.from('cota_history').insert(historyRecords)
    }

    // Update local state
    setCota({
      ...cota,
      credit_amount: creditAmount,
      entry_amount: entryAmount,
      outstanding_balance: outstandingBalance,
      n_installments: nInstallments,
      installment_value: installmentValue,
      entry_percentage: entryPercentage,
      monthly_rate: monthlyRate,
    })

    setEditMode(false)
    setSaving(false)
    setSuccess('Valores ajustados com sucesso!')

    setTimeout(() => setSuccess(null), 3000)
  }

  const handleApproveDocument = async () => {
    if (!statement) return

    setError(null)
    setSaving(true)

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'APPROVED' as DocumentStatus,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', statement.id)

    if (updateError) {
      setError('Erro ao aprovar documento.')
      setSaving(false)
      return
    }

    setStatement({ ...statement, status: 'APPROVED' })
    setSaving(false)
    setSuccess('Documento aprovado!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleRejectDocument = async (reason: string) => {
    if (!statement || !reason) return

    setError(null)
    setSaving(true)

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'REJECTED' as DocumentStatus,
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', statement.id)

    if (updateError) {
      setError('Erro ao rejeitar documento.')
      setSaving(false)
      return
    }

    setStatement({ ...statement, status: 'REJECTED', rejection_reason: reason })
    setSaving(false)
    setSuccess('Documento rejeitado.')
    setTimeout(() => setSuccess(null), 3000)
  }

  const cancelEdit = () => {
    if (!cota) return

    setEditForm({
      creditAmount: formatCurrencyInput(cota.credit_amount),
      entryAmount: formatCurrencyInput(cota.entry_amount),
      outstandingBalance: formatCurrencyInput(cota.outstanding_balance),
      nInstallments: String(cota.n_installments),
      installmentValue: formatCurrencyInput(cota.installment_value),
    })
    setEditMode(false)
    setError(null)
  }

  const handleStatusChange = async (newStatus: CotaStatus) => {
    if (!cota || newStatus === cota.status) return

    const confirmed = window.confirm(
      `Confirma a alteração do status de "${getCotaStatusLabel(cota.status)}" para "${getCotaStatusLabel(newStatus)}"?`
    )
    if (!confirmed) return

    setUpdatingStatus(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotas/${cota.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao atualizar status')
        return
      }

      setCota({ ...cota, status: newStatus })
      setSuccess('Status atualizado com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Erro ao atualizar status. Tente novamente.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/admin/cotas" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Cotas
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando detalhes da cota...</p>
        </div>
      </div>
    )
  }

  if (!cota) {
    return (
      <div className="space-y-6">
        <Link href="/admin/cotas" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Cotas
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600">Cota não encontrada.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/admin/cotas" className="inline-flex items-center text-primary hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Voltar para Cotas
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{cota.administrator}</h1>
            <Badge variant={getStatusBadgeVariant(cota.status)}>
              {getCotaStatusLabel(cota.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Criada em {new Date(cota.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Link href={`/cota/${cota.id}`} target="_blank">
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Página Pública
          </Button>
        </Link>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Values */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Valores Financeiros
                </CardTitle>
                <CardDescription>
                  {editMode ? 'Ajuste os valores conforme o extrato' : 'Valores informados pelo vendedor'}
                </CardDescription>
              </div>
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Ajustar Valores
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveAdjustments} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor do Crédito (R$)</Label>
                    <Input
                      value={editForm.creditAmount}
                      onChange={(e) => setEditForm({ ...editForm, creditAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor da Entrada (R$)</Label>
                    <Input
                      value={editForm.entryAmount}
                      onChange={(e) => setEditForm({ ...editForm, entryAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Saldo Devedor (R$)</Label>
                    <Input
                      value={editForm.outstandingBalance}
                      onChange={(e) => setEditForm({ ...editForm, outstandingBalance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Parcelas</Label>
                    <Input
                      type="number"
                      value={editForm.nInstallments}
                      onChange={(e) => setEditForm({ ...editForm, nInstallments: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor da Parcela (R$)</Label>
                    <Input
                      value={editForm.installmentValue}
                      onChange={(e) => setEditForm({ ...editForm, installmentValue: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Crédito</p>
                    <p className="text-xl font-bold">{formatCurrency(cota.credit_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entrada</p>
                    <p className="text-xl font-bold">{formatCurrency(cota.entry_amount)}</p>
                    <p className="text-xs text-muted-foreground">{cota.entry_percentage.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                    <p className="text-xl font-bold">{formatCurrency(cota.outstanding_balance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Parcelas</p>
                    <p className="text-xl font-bold">{cota.n_installments}x</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                    <p className="text-xl font-bold">{formatCurrency(cota.installment_value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa Mensal</p>
                    <p className="text-xl font-bold">
                      {cota.monthly_rate ? `${cota.monthly_rate.toFixed(4)}%` : '-'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statement Document */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extrato da Administradora
              </CardTitle>
              <CardDescription>
                Documento enviado pelo vendedor para verificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statement ? (
                <div className="space-y-4">
                  {/* Document Info Header */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-gray-500" />
                      <div>
                        <p className="font-medium">{statement.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Enviado em {new Date(statement.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getDocStatusBadgeVariant(statement.status)}>
                        {getDocumentStatusLabel(statement.status)}
                      </Badge>
                      <a href={statement.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      </a>
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="border rounded-lg overflow-hidden bg-gray-100">
                    {statement.file_url ? (
                      statement.file_name.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                          src={statement.file_url}
                          className="w-full h-[500px]"
                          title="Visualização do documento"
                        />
                      ) : (
                        <img
                          src={statement.file_url}
                          alt={statement.file_name}
                          className="w-full max-h-[500px] object-contain"
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                        <p>Não foi possível carregar o documento.</p>
                      </div>
                    )}
                  </div>

                  {statement.status === 'UNDER_REVIEW' && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                      <Button
                        onClick={handleApproveDocument}
                        disabled={saving}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar Documento
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Motivo da rejeição:')
                          if (reason) handleRejectDocument(reason)
                        }}
                        disabled={saving}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Rejeitar Documento
                      </Button>
                    </div>
                  )}

                  {statement.status === 'REJECTED' && statement.rejection_reason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">Motivo da rejeição:</p>
                      <p className="text-sm text-red-700">{statement.rejection_reason}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-muted-foreground">Nenhum extrato enviado pelo vendedor.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{cota.seller?.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{cota.seller?.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{cota.seller?.phone || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card>
            <CardHeader>
              <CardTitle>Status da Cota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Dropdown */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Alterar Status</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={cota.status}
                    onChange={(e) => handleStatusChange(e.target.value as CotaStatus)}
                    disabled={updatingStatus}
                    className={`flex-1 h-10 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
                      cota.status === 'AVAILABLE'
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : cota.status === 'RESERVED'
                        ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                        : cota.status === 'SOLD'
                        ? 'bg-gray-100 border-gray-300 text-gray-800'
                        : 'bg-red-100 border-red-300 text-red-800'
                    }`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {updatingStatus && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>

              <div className="pt-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Extrato</span>
                  {statement ? (
                    <Badge variant={getDocStatusBadgeVariant(statement.status)}>
                      {getDocumentStatusLabel(statement.status)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Não enviado</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Última atualização</span>
                  <span className="text-sm">
                    {new Date(cota.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toast Messages - Fixed position bottom right */}
      {(success || error) && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-600 text-white rounded-lg shadow-lg min-w-[280px]">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-600 text-white rounded-lg shadow-lg min-w-[280px]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
