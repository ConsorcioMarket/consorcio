'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User, Building2, FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DocumentList } from '@/components/DocumentUpload'
import { useToast } from '@/components/ui/toast'
import type { ProfilePJ, PJStatus, Document, DocumentType } from '@/types/database'

// CPF mask helper
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// CNPJ mask helper
function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

// Phone mask helper
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

// CEP mask helper
function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/(\d{5})(\d)/, '$1-$2')
}

function getPJStatusLabel(status: PJStatus): string {
  const labels: Record<PJStatus, string> = {
    INCOMPLETE: 'Incompleto',
    PENDING_REVIEW: 'Em análise',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
  }
  return labels[status] || status
}

function getPJStatusVariant(status: PJStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const variants: Record<PJStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    INCOMPLETE: 'secondary',
    PENDING_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
  }
  return variants[status] || 'outline'
}

export default function MeusDadosPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('pessoal')
  const supabase = createClient()

  // PF Form State
  const [showPFDialog, setShowPFDialog] = useState(false)
  const [pfForm, setPfForm] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
  })
  const [pfSaving, setPfSaving] = useState(false)
  const [pfError, setPfError] = useState<string | null>(null)
  const [pfEditing, setPfEditing] = useState(false)
  const [pfSuccess, setPfSuccess] = useState(false)

  // PJ State
  const [companies, setCompanies] = useState<ProfilePJ[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [showPJDialog, setShowPJDialog] = useState(false)
  const [editingPJ, setEditingPJ] = useState<ProfilePJ | null>(null)
  const [pjForm, setPjForm] = useState({
    legal_name: '',
    cnpj: '',
    company_email: '',
    company_phone: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
  })
  const [pjSaving, setPjSaving] = useState(false)
  const [pjError, setPjError] = useState<string | null>(null)

  // Documents State
  const [pfDocuments, setPfDocuments] = useState<Document[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [pjDocuments, setPjDocuments] = useState<Document[]>([])
  const [loadingPjDocuments, setLoadingPjDocuments] = useState(false)

  // Track if form has been initialized from profile
  const pfFormInitialized = useRef(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/meus-dados')
    }
  }, [user, authLoading, router])

  // Load profile data into form - only on initial load
  useEffect(() => {
    if (profile && !pfFormInitialized.current) {
      pfFormInitialized.current = true
      setPfForm({
        full_name: profile.full_name || '',
        cpf: profile.cpf || '',
        phone: profile.phone || '',
        address_street: profile.address_street || '',
        address_number: profile.address_number || '',
        address_complement: profile.address_complement || '',
        address_neighborhood: profile.address_neighborhood || '',
        address_city: profile.address_city || '',
        address_state: profile.address_state || '',
        address_zip: profile.address_zip || '',
      })
    }
  }, [profile])

  // Fetch companies function (reusable)
  const fetchCompanies = async () => {
    if (!user) return
    setLoadingCompanies(true)
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
    setLoadingCompanies(false)
  }

  // Fetch companies on mount
  useEffect(() => {
    if (user) {
      fetchCompanies()
    } else if (!authLoading) {
      setLoadingCompanies(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable
  }, [user, authLoading, pathname])

  // Fetch PF documents
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoadingDocuments(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('owner_type', 'PF')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
      } else {
        setPfDocuments(data || [])
      }
      setLoadingDocuments(false)
    }

    if (user) {
      fetchDocuments()
    } else if (!authLoading) {
      // User is not logged in and auth is done loading
      setLoadingDocuments(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable
  }, [user, authLoading, pathname])

  const openPFDialog = async () => {
    // Load PF form data
    if (profile) {
      setPfForm({
        full_name: profile.full_name || '',
        cpf: profile.cpf || '',
        phone: profile.phone || '',
        address_street: profile.address_street || '',
        address_number: profile.address_number || '',
        address_complement: profile.address_complement || '',
        address_neighborhood: profile.address_neighborhood || '',
        address_city: profile.address_city || '',
        address_state: profile.address_state || '',
        address_zip: profile.address_zip || '',
      })
    }
    setPfError(null)
    setShowPFDialog(true)

    // Load PF documents
    setLoadingDocuments(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', user?.id || '')
      .eq('owner_type', 'PF')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching PF documents:', error)
    } else {
      setPfDocuments(data || [])
    }
    setLoadingDocuments(false)
  }

  const handlePFDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setPfSaving(true)
    setPfError(null)

    // Validate required phone field
    const phoneDigits = pfForm.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setPfError('Por favor, informe um telefone válido com DDD (10 ou 11 dígitos).')
      setPfSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('profiles_pf')
      .update({
        full_name: pfForm.full_name,
        phone: pfForm.phone.replace(/\D/g, ''),
        address_street: pfForm.address_street || null,
        address_number: pfForm.address_number || null,
        address_complement: pfForm.address_complement || null,
        address_neighborhood: pfForm.address_neighborhood || null,
        address_city: pfForm.address_city || null,
        address_state: pfForm.address_state || null,
        address_zip: pfForm.address_zip.replace(/\D/g, '') || null,
      })
      .eq('id', user.id)
      .select()

    if (error) {
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        setPfError('Permissão negada. Por favor, faça logout e login novamente.')
      } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        setPfError('Sua sessão expirou. Por favor, faça logout e login novamente.')
      } else {
        setPfError(`Erro ao salvar dados: ${error.message || error.code || 'Erro desconhecido'}`)
      }
    } else if (!data || data.length === 0) {
      setPfError('Não foi possível atualizar o perfil. Sua sessão pode ter expirado.')
    } else {
      await refreshProfile()
      addToast({
        title: 'Dados salvos!',
        description: 'Suas informações foram atualizadas com sucesso.',
        variant: 'success',
      })
      // Don't close dialog - let user upload documents
    }

    setPfSaving(false)
  }

  const openNewPJDialog = () => {
    setEditingPJ(null)
    setPjForm({
      legal_name: '',
      cnpj: '',
      company_email: '',
      company_phone: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      address_zip: '',
    })
    setPjError(null)
    setPjDocuments([])
    setShowPJDialog(true)
  }

  const openEditPJDialog = async (pj: ProfilePJ) => {
    setEditingPJ(pj)
    setPjForm({
      legal_name: pj.legal_name || '',
      cnpj: pj.cnpj || '',
      company_email: pj.company_email || '',
      company_phone: pj.company_phone || '',
      address_street: pj.address_street || '',
      address_number: pj.address_number || '',
      address_complement: pj.address_complement || '',
      address_neighborhood: pj.address_neighborhood || '',
      address_city: pj.address_city || '',
      address_state: pj.address_state || '',
      address_zip: pj.address_zip || '',
    })
    setPjError(null)
    setShowPJDialog(true)

    // Load PJ documents
    setLoadingPjDocuments(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', pj.id)
      .eq('owner_type', 'PJ')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching PJ documents:', error)
    } else {
      setPjDocuments(data || [])
    }
    setLoadingPjDocuments(false)
  }

  const handlePJSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setPjSaving(true)
    setPjError(null)

    const pjData = {
      pf_id: user.id,
      legal_name: pjForm.legal_name,
      cnpj: pjForm.cnpj.replace(/\D/g, ''),
      company_email: pjForm.company_email || null,
      company_phone: pjForm.company_phone.replace(/\D/g, '') || null,
      address_street: pjForm.address_street || null,
      address_number: pjForm.address_number || null,
      address_complement: pjForm.address_complement || null,
      address_neighborhood: pjForm.address_neighborhood || null,
      address_city: pjForm.address_city || null,
      address_state: pjForm.address_state || null,
      address_zip: pjForm.address_zip.replace(/\D/g, '') || null,
    }

    let error
    let savedPJ: ProfilePJ | null = null

    if (editingPJ) {
      // Update existing
      const result = await supabase
        .from('profiles_pj')
        .update(pjData)
        .eq('id', editingPJ.id)
        .select()
      error = result.error
      savedPJ = result.data?.[0] || null
    } else {
      // Insert new - generate UUID for id and add timestamps
      const now = new Date().toISOString()
      const newPJId = crypto.randomUUID()
      const result = await supabase
        .from('profiles_pj')
        .insert({
          id: newPJId,
          ...pjData,
          created_at: now,
          updated_at: now,
        })
        .select()
      error = result.error
      savedPJ = result.data?.[0] || null
    }

    if (error) {
      if (error.code === '23505') {
        setPjError('Já existe uma empresa cadastrada com este CNPJ.')
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        setPjError('Permissão negada. Por favor, faça logout e login novamente.')
      } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        setPjError('Sua sessão expirou. Por favor, faça logout e login novamente.')
      } else {
        setPjError(`Erro ao salvar empresa: ${error.message || error.code || 'Erro desconhecido'}`)
      }
      console.error('Error saving PJ:', error)
    } else {
      // Refresh companies list
      const { data } = await supabase
        .from('profiles_pj')
        .select('*')
        .eq('pf_id', user.id)
        .order('created_at', { ascending: false })
      setCompanies(data || [])

      if (!editingPJ && savedPJ) {
        // New company created - switch to edit mode to show document upload
        setEditingPJ(savedPJ)
        setPjDocuments([])
        setLoadingPjDocuments(false)
        addToast({
          title: 'Empresa cadastrada com sucesso!',
          description: 'Agora você pode enviar os documentos da empresa.',
          variant: 'success',
        })
        // Keep dialog open - don't call setShowPJDialog(false)
      } else {
        // Existing company updated - close dialog
        setShowPJDialog(false)
        addToast({
          title: 'Dados salvos!',
          description: 'As informações da empresa foram atualizadas.',
          variant: 'success',
        })
      }
    }

    setPjSaving(false)
  }

  const handleDeletePJ = async (pjId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os documentos associados também serão excluídos.')) return

    // 1. Get all documents for this PJ
    const { data: docs } = await supabase
      .from('documents')
      .select('id, file_url')
      .eq('owner_id', pjId)
      .eq('owner_type', 'PJ')

    // 2. Delete files from Storage
    if (docs && docs.length > 0) {
      const filePaths = docs.map((doc) => {
        // Extract path from URL: .../documents-pj/pjId/filename
        const url = doc.file_url
        const match = url.match(/documents-pj\/(.+)$/)
        return match ? match[1] : null
      }).filter(Boolean) as string[]

      if (filePaths.length > 0) {
        await supabase.storage.from('documents-pj').remove(filePaths)
      }

      // 3. Delete document records from database
      await supabase
        .from('documents')
        .delete()
        .eq('owner_id', pjId)
        .eq('owner_type', 'PJ')
    }

    // 4. Delete the PJ record
    const { error } = await supabase
      .from('profiles_pj')
      .delete()
      .eq('id', pjId)

    if (error) {
      console.error('Error deleting PJ:', error)
      alert('Erro ao excluir empresa.')
    } else {
      setCompanies(companies.filter((c) => c.id !== pjId))
      addToast({
        title: 'Empresa excluída',
        description: 'A empresa e seus documentos foram excluídos com sucesso.',
        variant: 'success',
      })
    }
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
              Meus Dados
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Gerencie suas informações pessoais e empresas
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="pessoal" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Dados Pessoais</span>
                    <span className="sm:hidden">Pessoal</span>
                  </TabsTrigger>
                  <TabsTrigger value="empresas" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Empresas (PJ)</span>
                    <span className="sm:hidden">Empresas</span>
                  </TabsTrigger>
                </TabsList>

                {/* Personal Data Tab */}
                <TabsContent value="pessoal">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Seus Dados Pessoais</h3>
                        <p className="text-sm text-muted-foreground">
                          Gerencie suas informações pessoais e documentos
                        </p>
                      </div>
                      <Button onClick={openPFDialog} className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    </div>

                    {/* PF Summary Card */}
                    <Card className="border">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Nome completo</p>
                            <p className="font-medium">{profile?.full_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">CPF</p>
                            <p className="font-medium">{profile?.cpf ? formatCPF(profile.cpf) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Telefone</p>
                            <p className="font-medium">{profile?.phone ? formatPhone(profile.phone) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{profile?.email || '-'}</p>
                          </div>
                          {profile?.address_street && (
                            <div className="md:col-span-2">
                              <p className="text-sm text-muted-foreground">Endereço</p>
                              <p className="font-medium">
                                {profile.address_street}
                                {profile.address_number && `, ${profile.address_number}`}
                                {profile.address_complement && ` - ${profile.address_complement}`}
                                {profile.address_neighborhood && `, ${profile.address_neighborhood}`}
                                {profile.address_city && `, ${profile.address_city}`}
                                {profile.address_state && ` - ${profile.address_state}`}
                                {profile.address_zip && `, CEP: ${formatCEP(profile.address_zip)}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Documents Summary */}
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documentos Pessoais
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingDocuments ? (
                          <p className="text-sm text-muted-foreground">Carregando documentos...</p>
                        ) : pfDocuments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum documento enviado. Clique em &quot;Editar&quot; para enviar seus documentos.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {pfDocuments.map((doc) => (
                              <Badge
                                key={doc.id}
                                variant={
                                  doc.status === 'APPROVED' ? 'success' :
                                  doc.status === 'REJECTED' ? 'destructive' :
                                  doc.status === 'UNDER_REVIEW' ? 'warning' : 'secondary'
                                }
                              >
                                {doc.document_type.replace('PF_', '').replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Companies Tab */}
                <TabsContent value="empresas">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Suas Empresas</h3>
                        <p className="text-sm text-muted-foreground">
                          Cadastre empresas para comprar cotas como PJ
                        </p>
                      </div>
                      <Button onClick={openNewPJDialog} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nova Empresa
                      </Button>
                    </div>

                    {loadingCompanies ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">Carregando empresas...</p>
                      </div>
                    ) : companies.length === 0 ? (
                      <div className="text-center py-12 bg-muted/30 rounded-lg">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Você ainda não cadastrou nenhuma empresa.
                        </p>
                        <Button onClick={openNewPJDialog} variant="outline" className="mt-4">
                          Cadastrar primeira empresa
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {companies.map((company) => (
                          <Card key={company.id} className="border">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{company.legal_name}</CardTitle>
                                  <CardDescription>
                                    CNPJ: {formatCNPJ(company.cnpj)}
                                  </CardDescription>
                                </div>
                                <Badge variant={getPJStatusVariant(company.status)}>
                                  {getPJStatusLabel(company.status)}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditPJDialog(company)}
                                  className="flex items-center gap-1"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeletePJ(company.id)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Excluir
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PJ Dialog */}
      <Dialog open={showPJDialog} onOpenChange={(open) => {
        setShowPJDialog(open)
        if (!open) {
          // Refresh companies list when dialog closes to get updated status
          fetchCompanies()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPJ ? 'Editar Empresa e Documentos' : 'Nova Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingPJ
                ? 'Atualize os dados da empresa e envie os documentos necessários'
                : 'Cadastre uma nova empresa para comprar cotas como PJ'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePJSubmit} className="space-y-6 mt-4">
            {pjError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {pjError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Razão Social *</Label>
                <Input
                  id="legal_name"
                  value={pjForm.legal_name}
                  onChange={(e) => setPjForm({ ...pjForm, legal_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formatCNPJ(pjForm.cnpj)}
                  onChange={(e) => setPjForm({ ...pjForm, cnpj: e.target.value })}
                  required
                  disabled={!!editingPJ}
                  className={editingPJ ? 'bg-muted' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_email">Email da empresa</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={pjForm.company_email}
                  onChange={(e) => setPjForm({ ...pjForm, company_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_phone">Telefone da empresa</Label>
                <Input
                  id="company_phone"
                  placeholder="(00) 0000-0000"
                  value={formatPhone(pjForm.company_phone)}
                  onChange={(e) => setPjForm({ ...pjForm, company_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj_address_zip">CEP</Label>
                <Input
                  id="pj_address_zip"
                  placeholder="00000-000"
                  value={formatCEP(pjForm.address_zip)}
                  onChange={(e) => setPjForm({ ...pjForm, address_zip: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pj_address_state">Estado</Label>
                <select
                  id="pj_address_state"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={pjForm.address_state}
                  onChange={(e) => setPjForm({ ...pjForm, address_state: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj_address_street">Rua/Avenida</Label>
                <Input
                  id="pj_address_street"
                  value={pjForm.address_street}
                  onChange={(e) => setPjForm({ ...pjForm, address_street: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pj_address_number">Número</Label>
                <Input
                  id="pj_address_number"
                  value={pjForm.address_number}
                  onChange={(e) => setPjForm({ ...pjForm, address_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj_address_complement">Complemento</Label>
                <Input
                  id="pj_address_complement"
                  value={pjForm.address_complement}
                  onChange={(e) => setPjForm({ ...pjForm, address_complement: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pj_address_neighborhood">Bairro</Label>
                <Input
                  id="pj_address_neighborhood"
                  value={pjForm.address_neighborhood}
                  onChange={(e) => setPjForm({ ...pjForm, address_neighborhood: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pj_address_city">Cidade</Label>
              <Input
                id="pj_address_city"
                value={pjForm.address_city}
                onChange={(e) => setPjForm({ ...pjForm, address_city: e.target.value })}
              />
            </div>

            {editingPJ && (
              <div className="border-t pt-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold">Documentos da Empresa</h4>
                    <p className="text-sm text-muted-foreground">
                      Envie os documentos necessários para validar a empresa
                    </p>
                  </div>

                  {loadingPjDocuments ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">Carregando documentos...</p>
                    </div>
                  ) : (
                    <DocumentList
                      ownerId={editingPJ.id}
                      ownerType="PJ"
                      documentTypes={['PJ_ARTICLES_OF_INCORPORATION', 'PJ_PROOF_OF_ADDRESS', 'PJ_DRE', 'PJ_STATEMENT', 'PJ_EXTRA'] as DocumentType[]}
                      documents={pjDocuments}
                      onDocumentChange={setPjDocuments}
                      onPJStatusChange={() => {
                        // Update the editingPJ status in state
                        if (editingPJ) {
                          setEditingPJ({ ...editingPJ, status: 'PENDING_REVIEW' })
                        }
                        // Refresh companies list
                        fetchCompanies()
                        addToast({
                          title: 'Documentos enviados!',
                          description: 'A empresa está agora em análise.',
                          variant: 'success',
                        })
                      }}
                    />
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Importante:</strong> Os documentos enviados serão analisados pela nossa equipe.
                      Você será notificado quando a análise for concluída.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPJDialog(false)}
              >
                {editingPJ ? 'Fechar' : 'Cancelar'}
              </Button>
              <Button type="submit" disabled={pjSaving}>
                {pjSaving ? 'Salvando...' : editingPJ ? 'Salvar alterações' : 'Cadastrar empresa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PF Dialog */}
      <Dialog open={showPFDialog} onOpenChange={setShowPFDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dados Pessoais</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais e envie os documentos necessários
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePFDialogSubmit} className="space-y-6 mt-4">
            {pfError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {pfError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf_full_name">Nome completo *</Label>
                <Input
                  id="pf_full_name"
                  value={pfForm.full_name}
                  onChange={(e) => setPfForm({ ...pfForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pf_cpf">CPF</Label>
                <Input
                  id="pf_cpf"
                  value={formatCPF(pfForm.cpf)}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O CPF não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pf_phone">Telefone *</Label>
                <Input
                  id="pf_phone"
                  placeholder="(00) 00000-0000"
                  value={formatPhone(pfForm.phone)}
                  onChange={(e) => setPfForm({ ...pfForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pf_address_zip">CEP</Label>
                <Input
                  id="pf_address_zip"
                  placeholder="00000-000"
                  value={formatCEP(pfForm.address_zip)}
                  onChange={(e) => setPfForm({ ...pfForm, address_zip: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf_address_street">Rua/Avenida</Label>
                <Input
                  id="pf_address_street"
                  value={pfForm.address_street}
                  onChange={(e) => setPfForm({ ...pfForm, address_street: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pf_address_number">Número</Label>
                <Input
                  id="pf_address_number"
                  value={pfForm.address_number}
                  onChange={(e) => setPfForm({ ...pfForm, address_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf_address_complement">Complemento</Label>
                <Input
                  id="pf_address_complement"
                  value={pfForm.address_complement}
                  onChange={(e) => setPfForm({ ...pfForm, address_complement: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pf_address_neighborhood">Bairro</Label>
                <Input
                  id="pf_address_neighborhood"
                  value={pfForm.address_neighborhood}
                  onChange={(e) => setPfForm({ ...pfForm, address_neighborhood: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf_address_city">Cidade</Label>
                <Input
                  id="pf_address_city"
                  value={pfForm.address_city}
                  onChange={(e) => setPfForm({ ...pfForm, address_city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pf_address_state">Estado</Label>
                <select
                  id="pf_address_state"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={pfForm.address_state}
                  onChange={(e) => setPfForm({ ...pfForm, address_state: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>

            {/* PF Documents Section */}
            <div className="border-t pt-6 mt-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold">Documentos Pessoais</h4>
                  <p className="text-sm text-muted-foreground">
                    Envie os documentos necessários para validar sua conta
                  </p>
                </div>

                {loadingDocuments ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Carregando documentos...</p>
                  </div>
                ) : (
                  <DocumentList
                    ownerId={user.id}
                    ownerType="PF"
                    documentTypes={['PF_RG', 'PF_CPF', 'PF_INCOME_TAX'] as DocumentType[]}
                    documents={pfDocuments}
                    onDocumentChange={setPfDocuments}
                  />
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Importante:</strong> Os documentos enviados serão analisados pela nossa equipe.
                    Você será notificado quando a análise for concluída.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPFDialog(false)}
              >
                Fechar
              </Button>
              <Button type="submit" disabled={pfSaving}>
                {pfSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
