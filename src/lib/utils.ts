import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency in Brazilian Real
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue)
}

// Format percentage
export function formatPercentage(value: number | string, decimals: number = 2): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '-'
  return `${numValue.toFixed(decimals)}%`
}

// Format CPF: 000.000.000-00
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Format CNPJ: 00.000.000/0000-00
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '')
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

// Format phone: (00) 00000-0000
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

// Format CEP: 00000-000
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
}

// Calculate monthly rate using Newton-Raphson method (equivalent to Excel RATE)
export function calculateMonthlyRate(
  nPeriods: number,
  payment: number,
  presentValue: number,
  futureValue: number = 0,
  type: number = 0, // 0 = end of period, 1 = beginning
  guess: number = 0.01
): number {
  const maxIterations = 100
  const tolerance = 1e-7

  let rate = guess

  for (let i = 0; i < maxIterations; i++) {
    const f = presentValue * Math.pow(1 + rate, nPeriods) +
      payment * (1 + rate * type) * ((Math.pow(1 + rate, nPeriods) - 1) / rate) +
      futureValue

    const fPrime = presentValue * nPeriods * Math.pow(1 + rate, nPeriods - 1) +
      payment * (1 + rate * type) * (
        (nPeriods * Math.pow(1 + rate, nPeriods - 1) * rate - Math.pow(1 + rate, nPeriods) + 1) /
        (rate * rate)
      ) +
      (type === 1 ? payment * ((Math.pow(1 + rate, nPeriods) - 1) / rate) : 0)

    const newRate = rate - f / fPrime

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100 // Return as percentage
    }

    rate = newRate
  }

  return rate * 100
}

// Calculate entry percentage
export function calculateEntryPercentage(entryAmount: number, creditAmount: number): number {
  if (creditAmount === 0) return 0
  return (entryAmount / creditAmount) * 100
}

// Validate CPF
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')

  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i)
  }
  let digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(cleaned[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i)
  }
  digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(cleaned[10])) return false

  return true
}

// Validate CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')

  if (cleaned.length !== 14) return false
  if (/^(\d)\1+$/.test(cleaned)) return false

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i]
  }
  let digit = sum % 11
  digit = digit < 2 ? 0 : 11 - digit
  if (digit !== parseInt(cleaned[12])) return false

  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i]
  }
  digit = sum % 11
  digit = digit < 2 ? 0 : 11 - digit
  if (digit !== parseInt(cleaned[13])) return false

  return true
}

// Get status label in Portuguese
export function getCotaStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: 'Disponível',
    RESERVED: 'Reservada',
    SOLD: 'Vendida',
    REMOVED: 'Removida',
  }
  return labels[status] || status
}

export function getProposalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    UNDER_REVIEW: 'Em Análise',
    PRE_APPROVED: 'Pré-Aprovada',
    APPROVED: 'Aprovada',
    TRANSFER_STARTED: 'Transferência Iniciada',
    COMPLETED: 'Concluída',
    REJECTED: 'Rejeitada',
  }
  return labels[status] || status
}

export function getDocumentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_UPLOAD: 'Pendente',
    UNDER_REVIEW: 'Em Análise',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
  }
  return labels[status] || status
}

export function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PF_RG: 'RG',
    PF_CPF: 'CPF',
    PF_BIRTH_CERTIFICATE: 'Certidão de Nascimento',
    PF_INCOME_TAX: 'Imposto de Renda',
    PF_EXTRA: 'Documento Adicional',
    PJ_ARTICLES_OF_INCORPORATION: 'Contrato Social',
    PJ_PROOF_OF_ADDRESS: 'Comprovante de Endereço',
    PJ_DRE: 'DRE',
    PJ_STATEMENT: 'Extrato Bancário',
    PJ_EXTRA: 'Documento Adicional',
    COTA_STATEMENT: 'Extrato do Consórcio',
  }
  return labels[type] || type
}
