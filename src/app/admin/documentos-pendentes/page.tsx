'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText,
  Search,
  Check,
  X,
  AlertCircle,
  Download,
  User,
  Building2,
  CreditCard,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { DocumentStatus } from '@/types/database'

interface PendingDocument {
  id: string
  file_name: string
  file_url: string
  document_type: string
  owner_type: 'PF' | 'PJ' | 'COTA'
  owner_id: string
  status: DocumentStatus
  created_at: string
  // Owner info
  owner_name: string
  owner_link: string
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    RG_FRENTE: 'RG (Frente)',
    RG_VERSO: 'RG (Verso)',
    CNH: 'CNH',
    COMPROVANTE_RESIDENCIA: 'Comprovante de Residência',
    CONTRATO_SOCIAL: 'Contrato Social',
    CARTAO_CNPJ: 'Cartão CNPJ',
    COTA_STATEMENT: 'Extrato da Cota',
  }
  return labels[type] || type
}

function getOwnerTypeIcon(type: 'PF' | 'PJ' | 'COTA') {
  switch (type) {
    case 'PF':
      return User
    case 'PJ':
      return Building2
    case 'COTA':
      return CreditCard
  }
}

function getOwnerTypeLabel(type: 'PF' | 'PJ' | 'COTA'): string {
  switch (type) {
    case 'PF':
      return 'Pessoa Física'
    case 'PJ':
      return 'Pessoa Jurídica'
    case 'COTA':
      return 'Cota'
  }
}

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

function getFilePathFromUrl(fileUrl: string, ownerType: string): string {
  const bucketName = getBucketName(ownerType)
  const regex = new RegExp(`${bucketName}/(.+)$`)
  const match = fileUrl.match(regex)
  return match ? match[1] : ''
}

export default function DocumentosPendentesPage() {
  const { addToast } = useToast()
  const [documents, setDocuments] = useState<PendingDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'PF' | 'PJ' | 'COTA'>('all')

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'approve' | 'reject' | null
    document: PendingDocument | null
  }>({ open: false, type: null, document: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const fetchDocuments = async () => {
    setLoading(true)

    // Fetch all documents with UNDER_REVIEW status
    const { data: docsData, error } = await supabase
      .from('documents')
      .select('*')
      .eq('status', 'UNDER_REVIEW')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      setLoading(false)
      return
    }

    // Fetch owner info for each document
    const documentsWithOwners: PendingDocument[] = await Promise.all(
      (docsData || []).map(async (doc) => {
        let owner_name = 'Desconhecido'
        let owner_link = '#'

        if (doc.owner_type === 'PF') {
          const { data: pf } = await supabase
            .from('profiles_pf')
            .select('full_name')
            .eq('id', doc.owner_id)
            .single()
          owner_name = pf?.full_name || 'Usuário não encontrado'
          owner_link = `/admin/usuarios/${doc.owner_id}`
        } else if (doc.owner_type === 'PJ') {
          const { data: pj } = await supabase
            .from('profiles_pj')
            .select('legal_name, pf_id')
            .eq('id', doc.owner_id)
            .single()
          owner_name = pj?.legal_name || 'Empresa não encontrada'
          owner_link = pj?.pf_id ? `/admin/usuarios/${pj.pf_id}` : '#'
        } else if (doc.owner_type === 'COTA') {
          const { data: cota } = await supabase
            .from('cotas')
            .select('administrator')
            .eq('id', doc.owner_id)
            .single()
          owner_name = cota?.administrator || 'Cota não encontrada'
          owner_link = `/admin/cotas/${doc.owner_id}`
        }

        // Generate signed URL for the document
        const bucketName = getBucketName(doc.owner_type)
        const filePath = getFilePathFromUrl(doc.file_url, doc.owner_type)
        let signedFileUrl = doc.file_url

        if (filePath) {
          const { data: signedUrlData } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600) // 1 hour expiration

          if (signedUrlData?.signedUrl) {
            signedFileUrl = signedUrlData.signedUrl
          }
        }

        return {
          ...doc,
          file_url: signedFileUrl,
          owner_name,
          owner_link,
        }
      })
    )

    setDocuments(documentsWithOwners)
    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAction = async () => {
    if (!actionDialog.document || !actionDialog.type) return

    setActionLoading(true)

    try {
      const newStatus = actionDialog.type === 'approve' ? 'APPROVED' : 'REJECTED'

      if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
        addToast({
          title: 'Campo obrigatório',
          description: 'Por favor, informe o motivo da rejeição.',
          variant: 'warning',
        })
        setActionLoading(false)
        return
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      }

      if (newStatus === 'REJECTED') {
        updateData.rejection_reason = rejectionReason
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', actionDialog.document.id)

      if (error) throw error

      // Remove from list
      setDocuments((prev) => prev.filter((d) => d.id !== actionDialog.document!.id))

      addToast({
        title: actionDialog.type === 'approve' ? 'Documento aprovado!' : 'Documento rejeitado',
        description: `O documento foi ${actionDialog.type === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso.`,
        variant: 'success',
      })

      setActionDialog({ open: false, type: null, document: null })
      setRejectionReason('')
    } catch (error) {
      console.error('Error updating document:', error)
      addToast({
        title: 'Erro',
        description: 'Erro ao atualizar documento. Tente novamente.',
        variant: 'error',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDocumentTypeLabel(doc.document_type).toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' || doc.owner_type === filterType

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documentos Pendentes</h1>
        <p className="text-muted-foreground">
          {documents.length} documento{documents.length !== 1 ? 's' : ''} aguardando análise
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, arquivo ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'PF' | 'PJ' | 'COTA')}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os tipos</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
                <option value="COTA">Cotas</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-5 w-5" />
            Lista de Documentos ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Carregando documentos...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">
                {documents.length === 0
                  ? 'Nenhum documento pendente de análise!'
                  : 'Nenhum documento encontrado com os filtros aplicados.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="sm:hidden divide-y">
                {filteredDocuments.map((doc) => {
                  const OwnerIcon = getOwnerTypeIcon(doc.owner_type)
                  return (
                    <div key={doc.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getDocumentTypeLabel(doc.document_type)}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 gap-1">
                          <OwnerIcon className="h-3 w-3" />
                          {doc.owner_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <OwnerIcon className="h-4 w-4 text-muted-foreground" />
                        <Link href={doc.owner_link} className="text-primary hover:underline truncate">
                          {doc.owner_name}
                        </Link>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="flex gap-2">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setActionDialog({ open: true, type: 'approve', document: doc })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setActionDialog({ open: true, type: 'reject', document: doc })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Documento</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Proprietário</th>
                      <th className="text-center p-3 font-medium">Categoria</th>
                      <th className="text-center p-3 font-medium">Data</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => {
                      const OwnerIcon = getOwnerTypeIcon(doc.owner_type)
                      return (
                        <tr key={doc.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">{doc.file_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {getDocumentTypeLabel(doc.document_type)}
                          </td>
                          <td className="p-3">
                            <Link
                              href={doc.owner_link}
                              className="flex items-center gap-2 text-primary hover:underline"
                            >
                              <OwnerIcon className="h-4 w-4" />
                              <span className="truncate max-w-[180px]">{doc.owner_name}</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="gap-1">
                              <OwnerIcon className="h-3 w-3" />
                              {getOwnerTypeLabel(doc.owner_type)}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" title="Baixar documento">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                              <Link href={doc.owner_link}>
                                <Button variant="outline" size="sm" title="Ver proprietário">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => setActionDialog({ open: true, type: 'approve', document: doc })}
                                title="Aprovar"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setActionDialog({ open: true, type: 'reject', document: doc })}
                                title="Rejeitar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, type: null, document: null })
            setRejectionReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'approve' ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {actionDialog.type === 'approve' ? 'Aprovar' : 'Rejeitar'} Documento
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' ? (
                <>
                  Você está prestes a aprovar o documento{' '}
                  <strong>{actionDialog.document?.file_name}</strong>.
                </>
              ) : (
                <>
                  Você está prestes a rejeitar o documento{' '}
                  <strong>{actionDialog.document?.file_name}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.document && (
            <div className="py-2 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Tipo:</span>{' '}
                {getDocumentTypeLabel(actionDialog.document.document_type)}
              </p>
              <p>
                <span className="text-muted-foreground">Proprietário:</span>{' '}
                {actionDialog.document.owner_name} ({getOwnerTypeLabel(actionDialog.document.owner_type)})
              </p>
            </div>
          )}

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
                setActionDialog({ open: false, type: null, document: null })
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
    </div>
  )
}
