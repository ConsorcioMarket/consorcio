'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Building2, FileText, Save, Plus, Pencil, Trash2 } from 'lucide-react'
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
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('pessoal')
  const supabase = createClient()

  // PF Form State
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
  const [pfEditing, setPfEditing] = useState(false)
  const [pfSaving, setPfSaving] = useState(false)
  const [pfSuccess, setPfSuccess] = useState(false)
  const [pfError, setPfError] = useState<string | null>(null)

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial form population from context
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

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true)
      const { data, error } = await supabase
        .from('profiles_pj')
        .select('*')
        .eq('pf_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching companies:', error)
      } else {
        setCompanies(data || [])
      }
      setLoadingCompanies(false)
    }

    if (user) {
      fetchCompanies()
    } else if (!authLoading) {
      // User is not logged in and auth is done loading
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Cleanup state when user logs out
      setLoadingCompanies(false)
    }
  }, [user, authLoading, supabase])

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Cleanup state when user logs out
      setLoadingDocuments(false)
    }
  }, [user, authLoading, supabase])

  const handlePfSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setPfSaving(true)
    setPfError(null)
    setPfSuccess(false)

    console.log('Updating profile for user.id:', user.id)

    const { data, error } = await supabase
      .from('profiles_pf')
      .update({
        full_name: pfForm.full_name,
        phone: pfForm.phone.replace(/\D/g, '') || null,
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

    console.log('Update result - data:', data, 'error:', error)

    if (error) {
      setPfError('Erro ao salvar dados. Por favor, tente novamente.')
      console.error('Error updating profile:', error)
    } else if (!data || data.length === 0) {
      setPfError('Não foi possível atualizar o perfil. Tente fazer logout e login novamente.')
      console.error('No rows updated - possible RLS issue')
    } else {
      setPfSuccess(true)
      setPfEditing(false) // Exit edit mode after successful save
      await refreshProfile()
      setTimeout(() => setPfSuccess(false), 3000)
      addToast({
        title: 'Dados salvos!',
        description: 'Suas informações foram atualizadas com sucesso.',
        variant: 'success',
      })
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
    setShowPJDialog(true)
  }

  const openEditPJDialog = (pj: ProfilePJ) => {
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
    if (editingPJ) {
      // Update existing
      const result = await supabase
        .from('profiles_pj')
        .update(pjData)
        .eq('id', editingPJ.id)
      error = result.error
    } else {
      // Insert new - generate UUID for id and add timestamps
      const now = new Date().toISOString()
      const result = await supabase
        .from('profiles_pj')
        .insert({
          id: crypto.randomUUID(),
          ...pjData,
          created_at: now,
          updated_at: now,
        })
      error = result.error
    }

    if (error) {
      if (error.code === '23505') {
        setPjError('Já existe uma empresa cadastrada com este CNPJ.')
      } else {
        setPjError('Erro ao salvar empresa. Por favor, tente novamente.')
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
      setShowPJDialog(false)
    }

    setPjSaving(false)
  }

  const handleDeletePJ = async (pjId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return

    const { error } = await supabase
      .from('profiles_pj')
      .delete()
      .eq('id', pjId)

    if (error) {
      console.error('Error deleting PJ:', error)
      alert('Erro ao excluir empresa.')
    } else {
      setCompanies(companies.filter((c) => c.id !== pjId))
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
                <TabsList className="grid w-full grid-cols-3 mb-8">
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
                  <TabsTrigger value="documentos" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Documentos</span>
                    <span className="sm:hidden">Docs</span>
                  </TabsTrigger>
                </TabsList>

                {/* Personal Data Tab */}
                <TabsContent value="pessoal">
                  <form onSubmit={handlePfSubmit} className="space-y-6">
                    {pfError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {pfError}
                      </div>
                    )}
                    {pfSuccess && (
                      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                        Dados salvos com sucesso!
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nome completo *</Label>
                        <Input
                          id="full_name"
                          value={pfForm.full_name}
                          onChange={(e) => setPfForm({ ...pfForm, full_name: e.target.value })}
                          required
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          value={formatCPF(pfForm.cpf)}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          O CPF não pode ser alterado
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          placeholder="(00) 00000-0000"
                          value={formatPhone(pfForm.phone)}
                          onChange={(e) => setPfForm({ ...pfForm, phone: e.target.value })}
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address_zip">CEP</Label>
                        <Input
                          id="address_zip"
                          placeholder="00000-000"
                          value={formatCEP(pfForm.address_zip)}
                          onChange={(e) => setPfForm({ ...pfForm, address_zip: e.target.value })}
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="address_street">Rua/Avenida</Label>
                        <Input
                          id="address_street"
                          value={pfForm.address_street}
                          onChange={(e) => setPfForm({ ...pfForm, address_street: e.target.value })}
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address_number">Número</Label>
                        <Input
                          id="address_number"
                          value={pfForm.address_number}
                          onChange={(e) => setPfForm({ ...pfForm, address_number: e.target.value })}
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="address_complement">Complemento</Label>
                        <Input
                          id="address_complement"
                          value={pfForm.address_complement}
                          onChange={(e) => setPfForm({ ...pfForm, address_complement: e.target.value })}
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address_neighborhood">Bairro</Label>
                        <Input
                          id="address_neighborhood"
                          value={pfForm.address_neighborhood}
                          onChange={(e) => setPfForm({ ...pfForm, address_neighborhood: e.target.value })}
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="address_city">Cidade</Label>
                        <Input
                          id="address_city"
                          value={pfForm.address_city}
                          onChange={(e) => setPfForm({ ...pfForm, address_city: e.target.value })}
                          disabled={!pfEditing}
                          className={!pfEditing ? 'bg-muted' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address_state">Estado</Label>
                        <select
                          id="address_state"
                          className={`flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${!pfEditing ? 'bg-muted' : 'bg-transparent'}`}
                          value={pfForm.address_state}
                          onChange={(e) => setPfForm({ ...pfForm, address_state: e.target.value })}
                          disabled={!pfEditing}
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

                    <div className="flex justify-end pt-4 gap-2">
                      {pfEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPfEditing(false)
                              // Reset form to original profile data
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
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={pfSaving} className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            {pfSaving ? 'Salvando...' : 'Salvar alterações'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => setPfEditing(true)}
                          className="flex items-center gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </form>
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

                {/* Documents Tab */}
                <TabsContent value="documentos">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold">Documentos Pessoais</h3>
                      <p className="text-sm text-muted-foreground">
                        Envie os documentos necessários para validar sua conta
                      </p>
                    </div>

                    {loadingDocuments ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">Carregando documentos...</p>
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PJ Dialog */}
      <Dialog open={showPJDialog} onOpenChange={setShowPJDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPJ ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingPJ
                ? 'Atualize os dados da empresa'
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPJDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pjSaving}>
                {pjSaving ? 'Salvando...' : editingPJ ? 'Salvar alterações' : 'Cadastrar empresa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
