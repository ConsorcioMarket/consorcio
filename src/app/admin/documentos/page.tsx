'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { FileText, Search, Filter, Check, X, AlertCircle, ExternalLink, Eye, ArrowUpDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { getDocumentStatusLabel, getDocumentTypeLabel } from '@/lib/utils'
import type { DocumentStatus, OwnerType, DocumentType } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface DocumentWithOwner {
  id: string
  owner_id: string
  owner_type: OwnerType
  document_type: DocumentType
  file_url: string
  file_name: string
  status: DocumentStatus
  rejection_reason: string | null
  created_at: string
  owner_name: string
  owner_email: string
}

function getStatusBadgeVariant(status: DocumentStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<DocumentStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    PENDING_UPLOAD: 'secondary',
    UNDER_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
  }
  return variants[status] || 'outline'
}

function getOwnerTypeBadgeVariant(type: OwnerType): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<OwnerType, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    PF: 'default',
    PJ: 'secondary',
    COTA: 'outline',
  }
  return variants[type] || 'outline'
}

const PAGE_SIZE = 10

export default function AdminDocumentosPage() {
  const pathname = usePathname()
  const [documents, setDocuments] = useState<DocumentWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc') // desc = newest first
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Action dialog states
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'approve' | 'reject' | null
    document: DocumentWithOwner | null
  }>({ open: false, type: null, document: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Preview dialog
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean
    document: DocumentWithOwner | null
    signedUrl: string | null
    loadingUrl: boolean
  }>({ open: false, document: null, signedUrl: null, loadingUrl: false })

  const supabase = createClient()

  // Get bucket name from owner type
  const getBucketName = (ownerType: OwnerType): string => {
    switch (ownerType) {
      case 'PF': return 'documents-pf'
      case 'PJ': return 'documents-pj'
      case 'COTA': return 'documents-cota'
      default: return 'documents-pf'
    }
  }

  // Extract file path from public URL
  const getFilePathFromUrl = (url: string, bucketName: string): string | null => {
    try {
      // URL format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
      const regex = new RegExp(`/object/public/${bucketName}/(.+)$`)
      const match = url.match(regex)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  // Generate signed URL for private bucket access
  const getSignedUrl = async (doc: DocumentWithOwner): Promise<string | null> => {
    const bucketName = getBucketName(doc.owner_type)
    const filePath = getFilePathFromUrl(doc.file_url, bucketName)

    if (!filePath) {
      console.error('Could not extract file path from URL:', doc.file_url)
      return null
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  }

  // Handle opening preview dialog
  const handleOpenPreview = async (doc: DocumentWithOwner) => {
    setPreviewDialog({ open: true, document: doc, signedUrl: null, loadingUrl: true })

    // Try to get a signed URL in case the bucket is private
    const signedUrl = await getSignedUrl(doc)
    setPreviewDialog(prev => ({ ...prev, signedUrl, loadingUrl: false }))
  }

  const fetchDocuments = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: sortOrder === 'asc' })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as DocumentStatus)
    }

    if (ownerTypeFilter !== 'all') {
      query = query.eq('owner_type', ownerTypeFilter as OwnerType)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      setLoading(false)
      return
    }

    // Fetch owner information for each document
    const documentsWithOwners: DocumentWithOwner[] = []

    for (const doc of data || []) {
      let ownerName = ''
      let ownerEmail = ''

      if (doc.owner_type === 'PF') {
        const { data: pf } = await supabase
          .from('profiles_pf')
          .select('full_name, email')
          .eq('id', doc.owner_id)
          .single()
        ownerName = pf?.full_name || 'Desconhecido'
        ownerEmail = pf?.email || ''
      } else if (doc.owner_type === 'PJ') {
        const { data: pj } = await supabase
          .from('profiles_pj')
          .select('legal_name, company_email')
          .eq('id', doc.owner_id)
          .single()
        ownerName = pj?.legal_name || 'Desconhecido'
        ownerEmail = pj?.company_email || ''
      } else if (doc.owner_type === 'COTA') {
        const { data: cota } = await supabase
          .from('cotas')
          .select('administrator, seller:profiles_pf!cotas_seller_id_fkey(full_name)')
          .eq('id', doc.owner_id)
          .single()
        const seller = Array.isArray(cota?.seller) ? cota.seller[0] : cota?.seller
        ownerName = `${cota?.administrator || 'Cota'} - ${seller?.full_name || 'Vendedor'}`
        ownerEmail = ''
      }

      // Filter by search term if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (!ownerName.toLowerCase().includes(searchLower) && !doc.file_name.toLowerCase().includes(searchLower)) {
          continue
        }
      }

      documentsWithOwners.push({
        ...doc,
        owner_name: ownerName,
        owner_email: ownerEmail,
      })
    }

    setDocuments(documentsWithOwners)
    setTotalCount(count || 0)
    setLoading(false)
  }, [pathname, page, statusFilter, ownerTypeFilter, searchTerm, sortOrder])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleAction = async () => {
    if (!actionDialog.document || !actionDialog.type) return

    setActionLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const doc = actionDialog.document
      const newStatus: DocumentStatus = actionDialog.type === 'approve' ? 'APPROVED' : 'REJECTED'

      if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
        alert('Por favor, informe o motivo da rejeição.')
        setActionLoading(false)
        return
      }

      // Use the API route for document updates
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: newStatus === 'REJECTED' ? rejectionReason : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update document')
      }

      // Refresh list
      await fetchDocuments()
      setActionDialog({ open: false, type: null, document: null })
      setRejectionReason('')
    } catch (error) {
      console.error('Error updating document:', error)
      alert('Erro ao atualizar documento. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
          <p className="text-muted-foreground">Revisar e aprovar documentos enviados</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por proprietário ou arquivo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os status</option>
                <option value="PENDING_UPLOAD">Pendente Upload</option>
                <option value="UNDER_REVIEW">Em Análise</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
              <select
                value={ownerTypeFilter}
                onChange={(e) => {
                  setOwnerTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os tipos</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
                <option value="COTA">Cota</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                  setPage(1)
                }}
                className="h-10 px-3 whitespace-nowrap"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Documentos ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando documentos...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum documento encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Proprietário</th>
                    <th className="text-left p-3 font-medium">Tipo Doc</th>
                    <th className="text-left p-3 font-medium">Arquivo</th>
                    <th className="text-center p-3 font-medium">Origem</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Data</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{doc.owner_name}</div>
                        {doc.owner_email && (
                          <div className="text-xs text-muted-foreground">{doc.owner_email}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{getDocumentTypeLabel(doc.document_type)}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm truncate max-w-[200px]" title={doc.file_name}>
                          {doc.file_name}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={getOwnerTypeBadgeVariant(doc.owner_type)}>
                          {doc.owner_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={getStatusBadgeVariant(doc.status)}>
                          {getDocumentStatusLabel(doc.status)}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPreview(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {doc.status === 'UNDER_REVIEW' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setActionDialog({ open: true, type: 'approve', document: doc })}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setActionDialog({ open: true, type: 'reject', document: doc })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-4 pt-4 border-t"
            />
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, type: null, document: null })
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
              {actionDialog.type === 'approve' ? 'Aprovar' : 'Rejeitar'} Documento
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' ? (
                <>
                  Você está prestes a aprovar o documento{' '}
                  <strong>{getDocumentTypeLabel(actionDialog.document?.document_type || '')}</strong> de{' '}
                  <strong>{actionDialog.document?.owner_name}</strong>.
                </>
              ) : (
                <>
                  Você está prestes a rejeitar o documento{' '}
                  <strong>{getDocumentTypeLabel(actionDialog.document?.document_type || '')}</strong> de{' '}
                  <strong>{actionDialog.document?.owner_name}</strong>.
                </>
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
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => {
        if (!open) setPreviewDialog({ open: false, document: null, signedUrl: null, loadingUrl: false })
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Documento</DialogTitle>
          </DialogHeader>

          {previewDialog.document && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Proprietário</label>
                  <p className="font-medium">{previewDialog.document.owner_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Documento</label>
                  <p className="font-medium">{getDocumentTypeLabel(previewDialog.document.document_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Origem</label>
                  <Badge variant={getOwnerTypeBadgeVariant(previewDialog.document.owner_type)}>
                    {previewDialog.document.owner_type}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={getStatusBadgeVariant(previewDialog.document.status)}>
                    {getDocumentStatusLabel(previewDialog.document.status)}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Arquivo</label>
                  <p className="font-medium">{previewDialog.document.file_name}</p>
                </div>
                {previewDialog.document.rejection_reason && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Motivo da Rejeição</label>
                    <p className="text-red-600">{previewDialog.document.rejection_reason}</p>
                  </div>
                )}
              </div>

              {previewDialog.document.file_url && (
                <div className="border rounded-lg p-4">
                  {previewDialog.loadingUrl ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Carregando documento...</p>
                    </div>
                  ) : (() => {
                    // Use signed URL if available, otherwise fall back to public URL
                    const displayUrl = previewDialog.signedUrl || previewDialog.document.file_url
                    const isImage = previewDialog.document.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                                    previewDialog.document.file_url.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i)
                    const isPdf = previewDialog.document.file_name.match(/\.pdf$/i) ||
                                  previewDialog.document.file_url.match(/\.pdf($|\?)/i)

                    if (isImage) {
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayUrl}
                          alt={previewDialog.document.file_name}
                          className="max-w-full max-h-[400px] mx-auto"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const container = target.parentElement
                            if (container && !container.querySelector('.error-message')) {
                              const errorDiv = document.createElement('div')
                              errorDiv.className = 'text-center py-8 error-message'
                              errorDiv.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <p class="mt-2 text-red-600">Erro ao carregar imagem</p>
                                <p class="text-sm text-muted-foreground mt-1">O arquivo pode estar inacessível. Verifique as permissões do bucket no Supabase.</p>
                                <a href="${displayUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 mt-4 text-blue-600 hover:underline">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                  Tentar abrir em nova aba
                                </a>
                              `
                              container.appendChild(errorDiv)
                            }
                          }}
                        />
                      )
                    } else if (isPdf) {
                      return (
                        <iframe
                          src={displayUrl}
                          className="w-full h-[400px]"
                          title={previewDialog.document.file_name}
                        />
                      )
                    } else {
                      return (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 mx-auto text-gray-400" />
                          <p className="mt-2 text-muted-foreground">Pré-visualização não disponível</p>
                          <a
                            href={displayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Abrir em nova aba
                          </a>
                        </div>
                      )
                    }
                  })()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
