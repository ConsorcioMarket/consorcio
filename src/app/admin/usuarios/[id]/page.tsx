'use client'

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Building2,
  FileText,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Check,
  X,
  AlertCircle,
  Download,
  ExternalLink,
  Loader2,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCPF, formatCNPJ, formatCurrency, getCotaStatusLabel, getDocumentStatusLabel } from '@/lib/utils'
import type { PFStatus, PJStatus, CotaStatus, DocumentStatus, Document } from '@/types/database'

interface UserPFDetail {
  id: string
  email: string
  full_name: string
  cpf: string | null
  phone: string
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  role: string
  status: PFStatus
  created_at: string
  updated_at: string
}

interface UserPJDetail {
  id: string
  pf_id: string
  legal_name: string
  trade_name?: string | null
  cnpj: string
  company_email: string | null
  company_phone: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  status: PJStatus
  created_at: string
  updated_at: string
}

interface CotaInfo {
  id: string
  administrator: string
  credit_amount: number
  entry_amount: number
  status: CotaStatus
  created_at: string
}

// Helper function to get bucket name from owner_type
function getBucketName(ownerType: string): string {
  switch (ownerType) {
    case 'PF':
      return 'documents-pf'
    case 'PJ':
      return 'documents-pj'
    case 'COTA':
      return 'documents-cota'
    default:
      return 'documents-pf'
  }
}

// Helper function to extract file path from URL
function getFilePathFromUrl(fileUrl: string, ownerType: string): string {
  const bucketName = getBucketName(ownerType)
  const regex = new RegExp(`${bucketName}/(.+)$`)
  const match = fileUrl.match(regex)
  return match ? match[1] : ''
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    INCOMPLETE: 'secondary',
    PENDING_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
    PENDING_UPLOAD: 'secondary',
    UNDER_REVIEW: 'warning',
    AVAILABLE: 'success',
    RESERVED: 'warning',
    SOLD: 'default',
    REMOVED: 'destructive',
  }
  return variants[status] || 'outline'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INCOMPLETE: 'Incompleto',
    PENDING_REVIEW: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    PENDING_UPLOAD: 'Aguardando Upload',
    UNDER_REVIEW: 'Em Análise',
  }
  return labels[status] || status
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { addToast } = useToast()
  const [userPF, setUserPF] = useState<UserPFDetail | null>(null)
  const [userPJ, setUserPJ] = useState<UserPJDetail | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [cotas, setCotas] = useState<CotaInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Action states
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'approve' | 'reject' | null
    target: 'pf' | 'pj' | 'document'
    targetId: string
    targetName: string
  }>({ open: false, type: null, target: 'pf', targetId: '', targetName: '' })
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)

      // Fetch PF data
      const { data: pfData, error: pfError } = await supabase
        .from('profiles_pf')
        .select('*')
        .eq('id', id)
        .single()

      if (pfError || !pfData) {
        console.error('Error fetching user:', pfError)
        setLoading(false)
        return
      }

      setUserPF(pfData)

      // Fetch PJ data (if exists)
      const { data: pjData } = await supabase
        .from('profiles_pj')
        .select('*')
        .eq('pf_id', id)
        .single()

      if (pjData) {
        setUserPJ(pjData)
      }

      // Fetch documents (PF and PJ)
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .or(`owner_id.eq.${id}${pjData ? `,owner_id.eq.${pjData.id}` : ''}`)
        .order('created_at', { ascending: false })

      // Generate signed URLs for each document
      if (docsData && docsData.length > 0) {
        const docsWithSignedUrls = await Promise.all(
          docsData.map(async (doc) => {
            const bucketName = getBucketName(doc.owner_type)
            const filePath = getFilePathFromUrl(doc.file_url, doc.owner_type)

            if (filePath) {
              const { data: signedUrlData } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(filePath, 3600) // 1 hour expiration

              if (signedUrlData?.signedUrl) {
                return { ...doc, file_url: signedUrlData.signedUrl }
              }
            }
            return doc
          })
        )
        setDocuments(docsWithSignedUrls)
      } else {
        setDocuments([])
      }

      // Fetch cotas
      const { data: cotasData } = await supabase
        .from('cotas')
        .select('id, administrator, credit_amount, entry_amount, status, created_at')
        .eq('seller_id', id)
        .order('created_at', { ascending: false })

      setCotas((cotasData || []).map(c => ({
        ...c,
        credit_amount: Number(c.credit_amount),
        entry_amount: Number(c.entry_amount),
      })))

      setLoading(false)
    }

    fetchUserData()
  }, [id, supabase])

  const handleAction = async () => {
    if (!actionDialog.type || !actionDialog.targetId) return

    setActionLoading(true)

    try {
      const newStatus = actionDialog.type === 'approve' ? 'APPROVED' : 'REJECTED'

      if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
        alert('Por favor, informe o motivo da rejeição.')
        setActionLoading(false)
        return
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      let error = null

      if (actionDialog.target === 'pf') {
        const result = await supabase
          .from('profiles_pf')
          .update(updateData)
          .eq('id', actionDialog.targetId)
        error = result.error
      } else if (actionDialog.target === 'pj') {
        const result = await supabase
          .from('profiles_pj')
          .update(updateData)
          .eq('id', actionDialog.targetId)
        error = result.error
      } else {
        if (newStatus === 'REJECTED') {
          updateData.rejection_reason = rejectionReason
        }
        updateData.reviewed_at = new Date().toISOString()
        const result = await supabase
          .from('documents')
          .update(updateData)
          .eq('id', actionDialog.targetId)
        error = result.error
      }

      if (error) throw error

      // Update local state
      if (actionDialog.target === 'pf' && userPF) {
        setUserPF({ ...userPF, status: newStatus as PFStatus })
      } else if (actionDialog.target === 'pj' && userPJ) {
        setUserPJ({ ...userPJ, status: newStatus as PJStatus })
      } else if (actionDialog.target === 'document') {
        setDocuments(docs =>
          docs.map(d =>
            d.id === actionDialog.targetId
              ? { ...d, status: newStatus as DocumentStatus, rejection_reason: rejectionReason || null }
              : d
          )
        )
      }

      setSuccessMessage(
        actionDialog.type === 'approve'
          ? `${actionDialog.targetName} aprovado com sucesso!`
          : `${actionDialog.targetName} rejeitado.`
      )
      setTimeout(() => setSuccessMessage(null), 3000)

      setActionDialog({ open: false, type: null, target: 'pf', targetId: '', targetName: '' })
      setRejectionReason('')
    } catch (error) {
      console.error('Error updating:', error)
      alert('Erro ao atualizar. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatAddress = (data: UserPFDetail | UserPJDetail | null) => {
    if (!data) return null
    const parts = [
      data.address_street,
      data.address_number,
      data.address_complement,
      data.address_neighborhood,
      data.address_city,
      data.address_state,
      data.address_zip,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/admin/usuarios" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Usuários
        </Link>
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Carregando dados do usuário...</p>
        </div>
      </div>
    )
  }

  if (!userPF) {
    return (
      <div className="space-y-6">
        <Link href="/admin/usuarios" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Usuários
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600">Usuário não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pfDocuments = documents.filter(d => d.owner_id === userPF.id)
  const pjDocuments = userPJ ? documents.filter(d => d.owner_id === userPJ.id) : []

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/admin/usuarios" className="inline-flex items-center text-primary hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Voltar para Usuários
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{userPF.full_name}</h1>
            <Badge variant={getStatusBadgeVariant(userPF.status)}>
              {getStatusLabel(userPF.status)}
            </Badge>
            {userPF.role === 'ADMIN' && (
              <Badge variant="default">ADMIN</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Cadastrado em {new Date(userPF.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Personal Info (PF) */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais (PF)
                </CardTitle>
                <CardDescription>Informações do cadastro pessoa física</CardDescription>
              </div>
              {userPF.status === 'PENDING_REVIEW' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setActionDialog({
                      open: true,
                      type: 'approve',
                      target: 'pf',
                      targetId: userPF.id,
                      targetName: 'Cadastro PF',
                    })}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setActionDialog({
                      open: true,
                      type: 'reject',
                      target: 'pf',
                      targetId: userPF.id,
                      targetName: 'Cadastro PF',
                    })}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{userPF.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{userPF.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{userPF.cpf ? formatCPF(userPF.cpf) : '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Última atualização</p>
                    <p className="font-medium">{new Date(userPF.updated_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
              {formatAddress(userPF) && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">{formatAddress(userPF)}</p>
                  </div>
                </div>
              )}

              {/* PF Documents */}
              {pfDocuments.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Documentos PF</h4>
                  <div className="space-y-2">
                    {pfDocuments.map((doc) => (
                      <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-gray-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.document_type} - {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <Badge variant={getStatusBadgeVariant(doc.status)}>
                            {getDocumentStatusLabel(doc.status)}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDoc(doc)}
                              title="Ver documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" title="Baixar">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            {doc.status === 'UNDER_REVIEW' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => setActionDialog({
                                    open: true,
                                    type: 'approve',
                                    target: 'document',
                                    targetId: doc.id,
                                    targetName: `Documento ${doc.document_type}`,
                                  })}
                                  title="Aprovar"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setActionDialog({
                                    open: true,
                                    type: 'reject',
                                    target: 'document',
                                    targetId: doc.id,
                                    targetName: `Documento ${doc.document_type}`,
                                  })}
                                  title="Rejeitar"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Info (PJ) - if exists */}
          {userPJ && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados da Empresa (PJ)
                  </CardTitle>
                  <CardDescription>Informações do cadastro pessoa jurídica</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(userPJ.status)}>
                    {getStatusLabel(userPJ.status)}
                  </Badge>
                  {userPJ.status === 'PENDING_REVIEW' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setActionDialog({
                          open: true,
                          type: 'approve',
                          target: 'pj',
                          targetId: userPJ.id,
                          targetName: 'Cadastro PJ',
                        })}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setActionDialog({
                          open: true,
                          type: 'reject',
                          target: 'pj',
                          targetId: userPJ.id,
                          targetName: 'Cadastro PJ',
                        })}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Razão Social</p>
                    <p className="font-medium">{userPJ.legal_name}</p>
                  </div>
                  {userPJ.trade_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                      <p className="font-medium">{userPJ.trade_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">CNPJ</p>
                    <p className="font-medium">{formatCNPJ(userPJ.cnpj)}</p>
                  </div>
                  {userPJ.company_email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email da Empresa</p>
                      <p className="font-medium">{userPJ.company_email}</p>
                    </div>
                  )}
                  {userPJ.company_phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone da Empresa</p>
                      <p className="font-medium">{userPJ.company_phone}</p>
                    </div>
                  )}
                </div>
                {formatAddress(userPJ) && (
                  <div className="flex items-start gap-3 pt-4 border-t">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço da Empresa</p>
                      <p className="font-medium">{formatAddress(userPJ)}</p>
                    </div>
                  </div>
                )}

                {/* PJ Documents */}
                {pjDocuments.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Documentos PJ</h4>
                    <div className="space-y-2">
                      {pjDocuments.map((doc) => (
                        <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-5 w-5 text-gray-500 hrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.document_type} - {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <Badge variant={getStatusBadgeVariant(doc.status)}>
                              {getDocumentStatusLabel(doc.status)}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewDoc(doc)}
                                title="Ver documento"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" title="Baixar">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                              {doc.status === 'UNDER_REVIEW' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => setActionDialog({
                                      open: true,
                                      type: 'approve',
                                      target: 'document',
                                      targetId: doc.id,
                                      targetName: `Documento ${doc.document_type}`,
                                    })}
                                    title="Aprovar"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setActionDialog({
                                      open: true,
                                      type: 'reject',
                                      target: 'document',
                                      targetId: doc.id,
                                      targetName: `Documento ${doc.document_type}`,
                                    })}
                                    title="Rejeitar"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Cotas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cotas ({cotas.length})
            </CardTitle>
            <CardDescription>Cotas publicadas por este usuário</CardDescription>
          </CardHeader>
          <CardContent>
            {cotas.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <CreditCard className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma cota publicada</p>
              </div>
            ) : (
              <>
                {/* Mobile: Card view */}
                <div className="sm:hidden space-y-3">
                  {cotas.map((cota) => (
                    <div key={cota.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm truncate">{cota.administrator}</p>
                        <Badge variant={getStatusBadgeVariant(cota.status)} className="shrink-0 ml-2">
                          {getCotaStatusLabel(cota.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Crédito: {formatCurrency(cota.credit_amount)}</p>
                        <p>Entrada: {formatCurrency(cota.entry_amount)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          {new Date(cota.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <Link href={`/admin/cotas/${cota.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table view */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Administradora</th>
                        <th className="text-right p-3 font-medium">Crédito</th>
                        <th className="text-right p-3 font-medium">Entrada</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Cadastro</th>
                        <th className="text-center p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotas.map((cota) => (
                        <tr key={cota.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{cota.administrator}</td>
                          <td className="p-3 text-right">{formatCurrency(cota.credit_amount)}</td>
                          <td className="p-3 text-right">{formatCurrency(cota.entry_amount)}</td>
                          <td className="p-3 text-center">
                            <Badge variant={getStatusBadgeVariant(cota.status)}>
                              {getCotaStatusLabel(cota.status)}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {new Date(cota.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3 text-center">
                            <Link href={`/admin/cotas/${cota.id}`}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, type: null, target: 'pf', targetId: '', targetName: '' })
          setRejectionReason('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'approve' ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {actionDialog.type === 'approve' ? 'Aprovar' : 'Rejeitar'} {actionDialog.targetName}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' ? (
                <>Você está prestes a aprovar <strong>{actionDialog.targetName}</strong>.</>
              ) : (
                <>Você está prestes a rejeitar <strong>{actionDialog.targetName}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da rejeição *</label>
              <Textarea
                placeholder="Informe o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, type: null, target: 'pf', targetId: '', targetName: '' })
                setRejectionReason('')
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant={actionDialog.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewDoc?.file_name}
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.document_type} - Enviado em {previewDoc && new Date(previewDoc.created_at).toLocaleDateString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-gray-100 min-h-[400px]">
            {previewDoc && previewDoc.file_url ? (
              previewDoc.file_name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.file_url}
                  className="w-full h-[60vh]"
                  title="Visualização do documento"
                />
              ) : (
                <img
                  src={previewDoc.file_url}
                  alt={previewDoc.file_name}
                  className="w-full h-auto object-contain"
                />
              )
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <p>Não foi possível carregar o documento.</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <a href={previewDoc?.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </a>
            <Button onClick={() => setPreviewDoc(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
