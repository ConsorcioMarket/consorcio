'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Eye, Pencil, Trash2, AlertCircle } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatPercentage, getCotaStatusLabel } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
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

export default function MinhasCotasPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [cotas, setCotas] = useState<Cota[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cotaToDelete, setCotaToDelete] = useState<Cota | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/minhas-cotas')
    }
  }, [user, authLoading, router])

  // Fetch user's cotas
  useEffect(() => {
    const fetchCotas = async () => {
      if (!user) return

      setLoading(true)
      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching cotas:', error)
      } else {
        setCotas(data || [])
      }
      setLoading(false)
    }

    if (user) {
      fetchCotas()
    }
  }, [user, supabase])

  const handleDeleteClick = (cota: Cota) => {
    setCotaToDelete(cota)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!cotaToDelete) return

    setDeleting(true)
    const { error } = await supabase
      .from('cotas')
      .delete()
      .eq('id', cotaToDelete.id)

    if (error) {
      console.error('Error deleting cota:', error)
      addToast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a cota. Tente novamente.',
        variant: 'error',
      })
    } else {
      setCotas(cotas.filter((c) => c.id !== cotaToDelete.id))
      addToast({
        title: 'Cota excluída',
        description: 'A cota foi removida com sucesso.',
        variant: 'success',
      })
    }

    setDeleting(false)
    setDeleteDialogOpen(false)
    setCotaToDelete(null)
  }

  const canEditOrDelete = (status: CotaStatus) => {
    return status === 'AVAILABLE'
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Minhas Cotas
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Gerencie suas cotas de consórcio anunciadas
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              {/* Header with action button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-primary-darker">
                    Suas Cotas Anunciadas
                  </h2>
                  <p className="text-muted-foreground">
                    {cotas.length} {cotas.length === 1 ? 'cota' : 'cotas'} no total
                  </p>
                </div>
                <Link href="/publicar-cota">
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Anunciar Nova Cota
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Administradora</TableHead>
                        <TableHead>Crédito</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : cotas.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Você ainda não anunciou nenhuma cota.
                  </p>
                  <Link href="/publicar-cota">
                    <Button>Anunciar minha primeira cota</Button>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cotas.map((cota) => (
                        <TableRow key={cota.id}>
                          <TableCell className="font-medium">
                            {cota.administrator}
                          </TableCell>
                          <TableCell>{formatCurrency(cota.credit_amount)}</TableCell>
                          <TableCell>
                            {formatCurrency(cota.entry_amount)}
                            <span className="text-muted-foreground text-xs ml-1">
                              ({formatPercentage(cota.entry_percentage)})
                            </span>
                          </TableCell>
                          <TableCell>{cota.n_installments}x</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(cota.status)}>
                              {getCotaStatusLabel(cota.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(cota.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/cota/${cota.id}`)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEditOrDelete(cota.status) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/editar-cota/${cota.id}`)}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(cota)}
                                    className="text-red-600 hover:text-red-700"
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Legend */}
              {cotas.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Legenda:</strong> Cotas com status &quot;Disponível&quot; podem ser editadas ou excluídas.
                    Cotas reservadas ou vendidas não podem ser alteradas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cota</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta cota? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {cotaToDelete && (
            <div className="py-4">
              <p className="text-sm">
                <strong>Administradora:</strong> {cotaToDelete.administrator}
              </p>
              <p className="text-sm">
                <strong>Crédito:</strong> {formatCurrency(cotaToDelete.credit_amount)}
              </p>
              <p className="text-sm">
                <strong>Entrada:</strong> {formatCurrency(cotaToDelete.entry_amount)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
