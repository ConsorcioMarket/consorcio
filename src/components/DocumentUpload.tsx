'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, Check, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getDocumentStatusLabel, getDocumentTypeLabel } from '@/lib/utils'
import type { Document, DocumentType, DocumentStatus, OwnerType } from '@/types/database'

interface DocumentUploadProps {
  ownerId: string
  ownerType: OwnerType
  documentType: DocumentType
  existingDocument?: Document | null
  onUploadComplete?: (document: Document) => void
  onError?: (error: string) => void
  accept?: string
  maxSizeMB?: number
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

function getBucketName(ownerType: OwnerType): string {
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

export function DocumentUpload({
  ownerId,
  ownerType,
  documentType,
  existingDocument,
  onUploadComplete,
  onError,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 10,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      onError?.(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`)
      return
    }

    // Validate file type
    const allowedTypes = accept.split(',').map((t) => t.trim().toLowerCase())
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const isValidType = allowedTypes.some((type) => {
      if (type.startsWith('.')) {
        return fileExtension === type
      }
      return file.type.includes(type.replace('*', ''))
    })

    if (!isValidType) {
      onError?.(`Tipo de arquivo não permitido. Tipos aceitos: ${accept}`)
      return
    }

    setUploading(true)

    try {
      const bucketName = getBucketName(ownerType)
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${ownerId}/${documentType}/${timestamp}_${sanitizedName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      const fileUrl = urlData.publicUrl

      // If there's an existing document, update it; otherwise, create new
      let documentData: Document

      if (existingDocument) {
        // Delete old file from storage if different path
        if (existingDocument.file_url !== fileUrl) {
          const oldPath = existingDocument.file_url.split('/').slice(-3).join('/')
          await supabase.storage.from(bucketName).remove([oldPath])
        }

        // Update existing document record
        const { data, error: updateError } = await supabase
          .from('documents')
          .update({
            file_url: fileUrl,
            file_name: file.name,
            status: 'UNDER_REVIEW' as DocumentStatus,
            rejection_reason: null,
          })
          .eq('id', existingDocument.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Erro ao atualizar documento: ${updateError.message}`)
        }

        documentData = data
      } else {
        // Create new document record
        const { data, error: insertError } = await supabase
          .from('documents')
          .insert({
            owner_id: ownerId,
            owner_type: ownerType,
            document_type: documentType,
            file_url: fileUrl,
            file_name: file.name,
            status: 'UNDER_REVIEW' as DocumentStatus,
          })
          .select()
          .single()

        if (insertError) {
          throw new Error(`Erro ao salvar documento: ${insertError.message}`)
        }

        documentData = data
      }

      onUploadComplete?.(documentData)
    } catch (error) {
      console.error('Upload error:', error)
      onError?.(error instanceof Error ? error.message : 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{getDocumentTypeLabel(documentType)}</p>
          {existingDocument && (
            <Badge variant={getStatusBadgeVariant(existingDocument.status)} className="mt-1">
              {getDocumentStatusLabel(existingDocument.status)}
            </Badge>
          )}
        </div>
      </div>

      {/* Show rejection reason if rejected */}
      {existingDocument?.status === 'REJECTED' && existingDocument.rejection_reason && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{existingDocument.rejection_reason}</p>
        </div>
      )}

      {/* Show existing file info */}
      {existingDocument && existingDocument.status !== 'REJECTED' && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 truncate flex-1">
            {existingDocument.file_name}
          </span>
          {existingDocument.status === 'APPROVED' && (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </div>
      )}

      {/* Upload area - always show for rejected or if no document */}
      {(!existingDocument || existingDocument.status === 'REJECTED' || existingDocument.status === 'PENDING_UPLOAD') && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={triggerFileInput}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-muted-foreground">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: {accept} | Máx: {maxSizeMB}MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Replace button for approved documents that need update */}
      {existingDocument && existingDocument.status === 'APPROVED' && (
        <Button
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={uploading}
          className="w-full"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Substituir arquivo
            </>
          )}
        </Button>
      )}

      {/* Under review status */}
      {existingDocument && existingDocument.status === 'UNDER_REVIEW' && (
        <p className="text-xs text-muted-foreground text-center">
          Documento em análise. Aguarde a aprovação.
        </p>
      )}
    </div>
  )
}

interface DocumentListProps {
  ownerId: string
  ownerType: OwnerType
  documentTypes: DocumentType[]
  documents: Document[]
  onDocumentChange?: (documents: Document[]) => void
}

export function DocumentList({
  ownerId,
  ownerType,
  documentTypes,
  documents,
  onDocumentChange,
}: DocumentListProps) {
  const [error, setError] = useState<string | null>(null)

  const handleUploadComplete = (doc: Document) => {
    const existingIndex = documents.findIndex((d) => d.document_type === doc.document_type)
    let newDocs: Document[]

    if (existingIndex >= 0) {
      newDocs = [...documents]
      newDocs[existingIndex] = doc
    } else {
      newDocs = [...documents, doc]
    }

    onDocumentChange?.(newDocs)
    setError(null)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {documentTypes.map((docType) => {
          const existingDoc = documents.find((d) => d.document_type === docType)

          return (
            <DocumentUpload
              key={docType}
              ownerId={ownerId}
              ownerType={ownerType}
              documentType={docType}
              existingDocument={existingDoc}
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          )
        })}
      </div>
    </div>
  )
}
