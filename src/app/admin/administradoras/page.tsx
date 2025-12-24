'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Building2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Administrator {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export default function AdminAdministradorasPage() {
  const { addToast } = useToast()
  const [administrators, setAdministrators] = useState<Administrator[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Add/Edit form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    administrator: Administrator | null
  }>({ open: false, administrator: null })

  const supabase = useMemo(() => createClient(), [])

  const fetchAdministrators = async () => {
    setLoading(true)
    const { data, error } = await (supabase
      .from('administrators' as 'cotas')
      .select('*')
      .order('name') as unknown as Promise<{ data: Administrator[] | null; error: Error | null }>)

    if (error) {
      console.error('Error fetching administrators:', error)
      addToast({
        title: 'Erro',
        description: 'Erro ao carregar administradoras',
        variant: 'error',
      })
    } else {
      setAdministrators(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAdministrators()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = () => {
    setEditingId(null)
    setFormName('')
    setShowForm(true)
  }

  const handleEdit = (admin: Administrator) => {
    setEditingId(admin.id)
    setFormName(admin.name)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      addToast({
        title: 'Erro',
        description: 'Nome é obrigatório',
        variant: 'error',
      })
      return
    }

    setSaving(true)

    if (editingId) {
      // Update existing
      const { error } = await (supabase
        .from('administrators' as 'cotas')
        .update({ name: formName.trim() } as Record<string, unknown>)
        .eq('id', editingId) as unknown as Promise<{ error: Error | null }>)

      if (error) {
        console.error('Error updating administrator:', error)
        addToast({
          title: 'Erro',
          description: 'Erro ao atualizar administradora',
          variant: 'error',
        })
      } else {
        addToast({
          title: 'Sucesso',
          description: 'Administradora atualizada com sucesso',
          variant: 'success',
        })
        fetchAdministrators()
        handleCancelForm()
      }
    } else {
      // Create new
      const { error } = await ((supabase
        .from('administrators' as 'cotas') as unknown as { insert: (data: { name: string }) => Promise<{ error: Error | null }> })
        .insert({ name: formName.trim() }))

      if (error) {
        console.error('Error creating administrator:', error)
        addToast({
          title: 'Erro',
          description: error.message.includes('duplicate')
            ? 'Já existe uma administradora com este nome'
            : 'Erro ao criar administradora',
          variant: 'error',
        })
      } else {
        addToast({
          title: 'Sucesso',
          description: 'Administradora criada com sucesso',
          variant: 'success',
        })
        fetchAdministrators()
        handleCancelForm()
      }
    }

    setSaving(false)
  }

  const handleToggleActive = async (admin: Administrator) => {
    const newStatus = !admin.is_active
    const { error } = await (supabase
      .from('administrators' as 'cotas')
      .update({ is_active: newStatus } as Record<string, unknown>)
      .eq('id', admin.id) as unknown as Promise<{ error: Error | null }>)

    if (error) {
      console.error('Error toggling administrator status:', error)
      addToast({
        title: 'Erro',
        description: 'Erro ao atualizar status',
        variant: 'error',
      })
    } else {
      addToast({
        title: 'Sucesso',
        description: newStatus ? 'Administradora ativada' : 'Administradora desativada',
        variant: 'success',
      })
      fetchAdministrators()
    }
  }

  const handleDeleteClick = (admin: Administrator) => {
    setDeleteDialog({ open: true, administrator: admin })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.administrator) return

    setSaving(true)
    const { error } = await (supabase
      .from('administrators' as 'cotas')
      .delete()
      .eq('id', deleteDialog.administrator.id) as unknown as Promise<{ error: Error | null }>)

    if (error) {
      console.error('Error deleting administrator:', error)
      addToast({
        title: 'Erro',
        description: 'Erro ao excluir administradora. Pode estar em uso por cotas existentes.',
        variant: 'error',
      })
    } else {
      addToast({
        title: 'Sucesso',
        description: 'Administradora excluída com sucesso',
        variant: 'success',
      })
      fetchAdministrators()
    }

    setSaving(false)
    setDeleteDialog({ open: false, administrator: null })
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar ao Painel
        </Link>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Administradoras</h1>
            <p className="text-muted-foreground">Gerenciar lista de administradoras de consórcio</p>
          </div>
          <Button onClick={handleAdd} className="w-fit">
            <Plus className="h-4 w-4 mr-2" />
            Nova Administradora
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Administradora' : 'Nova Administradora'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Nome da administradora"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Administrators List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Administradoras ({administrators.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Carregando administradoras...</p>
            </div>
          ) : administrators.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma administradora cadastrada.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="sm:hidden divide-y">
                {administrators.map((admin) => (
                  <div key={admin.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{admin.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Criada em {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant={admin.is_active ? 'success' : 'secondary'}>
                        {admin.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(admin)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(admin)}
                      >
                        {admin.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(admin)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Criada em</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {administrators.map((admin) => (
                      <tr key={admin.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{admin.name}</td>
                        <td className="p-3 text-center">
                          <Badge variant={admin.is_active ? 'success' : 'secondary'}>
                            {admin.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(admin)}>
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(admin)}
                            >
                              {admin.is_active ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteClick(admin)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDeleteDialog({ open: false, administrator: null })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a administradora{' '}
              <strong>{deleteDialog.administrator?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. Se existirem cotas vinculadas a esta administradora,
              a exclusão falhará.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, administrator: null })}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
