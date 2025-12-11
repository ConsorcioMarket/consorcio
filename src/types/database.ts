export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type UserRole = 'USER' | 'ADMIN'
export type PFStatus = 'INCOMPLETE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
export type PJStatus = 'INCOMPLETE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
export type CotaStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'REMOVED'
export type ProposalStatus =
  | 'UNDER_REVIEW'
  | 'PRE_APPROVED'
  | 'APPROVED'
  | 'TRANSFER_STARTED'
  | 'COMPLETED'
  | 'REJECTED'
export type DocumentStatus = 'PENDING_UPLOAD' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
export type OwnerType = 'PF' | 'PJ' | 'COTA'
export type BuyerType = 'PF' | 'PJ'
export type DocumentType =
  | 'PF_RG'
  | 'PF_CPF'
  | 'PF_BIRTH_CERTIFICATE'
  | 'PF_INCOME_TAX'
  | 'PF_EXTRA'
  | 'PJ_ARTICLES_OF_INCORPORATION'
  | 'PJ_PROOF_OF_ADDRESS'
  | 'PJ_DRE'
  | 'PJ_STATEMENT'
  | 'PJ_EXTRA'
  | 'COTA_STATEMENT'

export interface Database {
  public: {
    Tables: {
      profiles_pf: {
        Row: {
          id: string
          email: string
          full_name: string
          cpf: string | null
          phone: string
          role: UserRole
          status: PFStatus
          address_street: string | null
          address_number: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string
          full_name: string
          cpf?: string | null
          phone: string
          role?: UserRole
          status?: PFStatus
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          cpf?: string
          phone?: string
          role?: UserRole
          status?: PFStatus
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles_pj: {
        Row: {
          id: string
          pf_id: string
          legal_name: string
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
        Insert: {
          id?: string
          pf_id: string
          legal_name: string
          cnpj: string
          company_email?: string | null
          company_phone?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          status?: PJStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pf_id?: string
          legal_name?: string
          cnpj?: string
          company_email?: string | null
          company_phone?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          status?: PJStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cotas: {
        Row: {
          id: string
          seller_id: string
          administrator: string
          credit_amount: number
          outstanding_balance: number
          n_installments: number
          installment_value: number
          entry_amount: number
          entry_percentage: number
          monthly_rate: number | null
          status: CotaStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          administrator: string
          credit_amount: number
          outstanding_balance: number
          n_installments: number
          installment_value: number
          entry_amount: number
          entry_percentage?: number
          monthly_rate?: number | null
          status?: CotaStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          administrator?: string
          credit_amount?: number
          outstanding_balance?: number
          n_installments?: number
          installment_value?: number
          entry_amount?: number
          entry_percentage?: number
          monthly_rate?: number | null
          status?: CotaStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          cota_id: string
          buyer_pf_id: string
          buyer_type: BuyerType
          buyer_entity_id: string
          group_id: string | null
          status: ProposalStatus
          rejection_reason: string | null
          transfer_fee: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cota_id: string
          buyer_pf_id: string
          buyer_type: BuyerType
          buyer_entity_id: string
          group_id?: string | null
          status?: ProposalStatus
          rejection_reason?: string | null
          transfer_fee?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cota_id?: string
          buyer_pf_id?: string
          buyer_type?: BuyerType
          buyer_entity_id?: string
          group_id?: string | null
          status?: ProposalStatus
          rejection_reason?: string | null
          transfer_fee?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          owner_id: string
          owner_type: OwnerType
          document_type: DocumentType
          file_url: string
          file_name: string
          status: DocumentStatus
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          owner_type: OwnerType
          document_type: DocumentType
          file_url: string
          file_name: string
          status?: DocumentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          owner_type?: OwnerType
          document_type?: DocumentType
          file_url?: string
          file_name?: string
          status?: DocumentStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_history: {
        Row: {
          id: string
          proposal_id: string
          old_status: ProposalStatus | null
          new_status: ProposalStatus
          changed_by: string | null
          notes: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          old_status?: ProposalStatus | null
          new_status: ProposalStatus
          changed_by?: string | null
          notes?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          old_status?: ProposalStatus | null
          new_status?: ProposalStatus
          changed_by?: string | null
          notes?: string | null
          changed_at?: string
        }
        Relationships: []
      }
      cota_history: {
        Row: {
          id: string
          cota_id: string
          field_changed: string
          old_value: string | null
          new_value: string | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          cota_id: string
          field_changed: string
          old_value?: string | null
          new_value?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          cota_id?: string
          field_changed?: string
          old_value?: string | null
          new_value?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      pf_status: PFStatus
      pj_status: PJStatus
      cota_status: CotaStatus
      proposal_status: ProposalStatus
      document_status: DocumentStatus
      owner_type: OwnerType
      buyer_type: BuyerType
      document_type: DocumentType
    }
  }
}

// Helper types
export type ProfilePF = Database['public']['Tables']['profiles_pf']['Row']
export type ProfilePJ = Database['public']['Tables']['profiles_pj']['Row']
export type Cota = Database['public']['Tables']['cotas']['Row']
export type Proposal = Database['public']['Tables']['proposals']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type ProposalHistory = Database['public']['Tables']['proposal_history']['Row']
export type CotaHistory = Database['public']['Tables']['cota_history']['Row']

// Extended types with relations
export type CotaWithSeller = Cota & {
  seller: ProfilePF
}

export type ProposalWithRelations = Proposal & {
  cota: Cota
  buyer: ProfilePF
}
