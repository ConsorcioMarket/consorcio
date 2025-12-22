import { PrismaClient, CotaStatus, PFStatus, PJStatus, ProposalStatus, DocumentStatus, BuyerType, OwnerType, DocumentType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Supabase admin client for creating test users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Brazilian consortium administrators (used in cotasData)
const _administrators = [
  'Bradesco Consórcio',
  'Itaú Consórcio',
  'Porto Seguro Consórcio',
  'Rodobens Consórcio',
  'Caixa Consórcio',
  'Santander Consórcio',
  'Embracon Consórcio',
  'Gazin Consórcio',
]
void _administrators // suppress unused warning

// Test user configurations
const testUsers = {
  seller: {
    email: 'vendedor@demo.consorciomarket.com.br',
    password: 'Demo123!',
    name: 'Carlos Silva (Vendedor)',
    phone: '11999887766',
    cpf: '12345678901',
    status: PFStatus.APPROVED, // Seller is approved
  },
  buyerPF: {
    email: 'comprador.pf@demo.consorciomarket.com.br',
    password: 'Demo123!',
    name: 'Maria Santos (Compradora PF)',
    phone: '11988776655',
    cpf: '98765432100',
    status: PFStatus.APPROVED, // Approved buyer
  },
  buyerPFPending: {
    email: 'comprador.pendente@demo.consorciomarket.com.br',
    password: 'Demo123!',
    name: 'João Oliveira (Pendente)',
    phone: '11977665544',
    cpf: '11122233344',
    status: PFStatus.PENDING_REVIEW, // Pending approval
  },
  buyerPFIncomplete: {
    email: 'comprador.incompleto@demo.consorciomarket.com.br',
    password: 'Demo123!',
    name: 'Ana Costa (Incompleto)',
    phone: '11966554433',
    cpf: null,
    status: PFStatus.INCOMPLETE, // Incomplete profile
  },
  admin: {
    email: 'admin@demo.consorciomarket.com.br',
    password: 'Admin123!',
    name: 'Administrador Sistema',
    phone: '11955443322',
    cpf: '00000000000',
    status: PFStatus.APPROVED,
    role: 'ADMIN' as const,
  },
}

// Helper to create or get user
interface UserConfig {
  email: string
  password: string
  name: string
  phone: string
  cpf: string | null
  status: PFStatus
  role?: 'USER' | 'ADMIN'
}

async function getOrCreateUser(config: UserConfig) {
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let userId: string

  const existingUser = existingUsers?.users?.find(u => u.email === config.email)

  if (existingUser) {
    console.log(`  User exists: ${config.email}`)
    userId = existingUser.id
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: config.email,
      password: config.password,
      email_confirm: true,
      user_metadata: {
        full_name: config.name,
        phone: config.phone,
      },
    })

    if (error) {
      console.error(`Error creating user ${config.email}:`, error)
      throw error
    }

    userId = newUser.user.id
    console.log(`  Created user: ${config.email}`)
  }

  // Create or update profile
  await prisma.profilePF.upsert({
    where: { id: userId },
    update: {
      status: config.status,
      role: config.role || 'USER',
      cpf: config.cpf,
      phone: config.phone,
    },
    create: {
      id: userId,
      email: config.email,
      fullName: config.name,
      phone: config.phone,
      cpf: config.cpf,
      role: config.role || 'USER',
      status: config.status,
    },
  })

  return userId
}

// Calculate monthly rate using Newton-Raphson method (equivalent to Excel RATE)
function calculateMonthlyRate(
  nPeriods: number,
  payment: number,
  presentValue: number
): number | null {
  if (nPeriods <= 0 || payment >= 0 || presentValue <= 0) {
    return null
  }

  const maxIterations = 100
  const tolerance = 1e-7
  let rate = 0.01 // initial guess

  for (let i = 0; i < maxIterations; i++) {
    const f =
      presentValue * Math.pow(1 + rate, nPeriods) +
      payment * ((Math.pow(1 + rate, nPeriods) - 1) / rate)

    const fPrime =
      presentValue * nPeriods * Math.pow(1 + rate, nPeriods - 1) +
      payment *
        ((nPeriods * Math.pow(1 + rate, nPeriods - 1) * rate - Math.pow(1 + rate, nPeriods) + 1) /
          (rate * rate))

    if (fPrime === 0) return null

    const newRate = rate - f / fPrime

    if (Math.abs(newRate - rate) < tolerance) {
      if (newRate > 0 && isFinite(newRate)) {
        return newRate * 100
      }
      return null
    }

    rate = newRate
    if (rate < -0.99 || rate > 1) return null
  }

  return null
}

// Generate realistic cota data
function generateCotaData(sellerId: string, administrator: string, creditAmount: number, status: CotaStatus) {
  const outstandingPercentage = 0.3 + Math.random() * 0.4
  const outstandingBalance = Math.round(creditAmount * outstandingPercentage)
  const nInstallments = Math.round(80 + Math.random() * 100)
  // Calculate a realistic installment value that results in a positive rate
  // Using a slightly higher installment to ensure positive rate
  const baseInstallment = outstandingBalance / nInstallments
  const installmentValue = Math.round(baseInstallment * (1.005 + Math.random() * 0.01) * 100) / 100
  const entryPercentage = Math.round((15 + Math.random() * 25) * 100) / 100
  const entryAmount = Math.round(creditAmount * (entryPercentage / 100))

  // Calculate the actual monthly rate using the RATE formula
  const monthlyRate = calculateMonthlyRate(nInstallments, -installmentValue, outstandingBalance)

  return {
    sellerId,
    administrator,
    creditAmount,
    outstandingBalance,
    nInstallments,
    installmentValue,
    entryAmount,
    entryPercentage,
    monthlyRate,
    status,
  }
}

async function main() {
  console.log('🌱 Starting comprehensive seed...\n')

  // ============================================
  // 1. CREATE USERS
  // ============================================
  console.log('👤 Creating users...')

  const sellerId = await getOrCreateUser(testUsers.seller)
  const buyerPFId = await getOrCreateUser(testUsers.buyerPF)
  const buyerPFPendingId = await getOrCreateUser(testUsers.buyerPFPending)
  // Create buyer with incomplete profile for demo purposes
  await getOrCreateUser(testUsers.buyerPFIncomplete)
  const adminId = await getOrCreateUser(testUsers.admin)

  console.log('')

  // ============================================
  // 2. CREATE PJ PROFILES (Companies)
  // ============================================
  console.log('🏢 Creating company profiles...')

  // Approved company for buyerPF
  const approvedPJ = await prisma.profilePJ.upsert({
    where: { cnpj: '12345678000190' },
    update: { status: PJStatus.APPROVED },
    create: {
      pfId: buyerPFId,
      legalName: 'Empresa Aprovada Ltda',
      cnpj: '12345678000190',
      companyEmail: 'contato@empresaaprovada.com.br',
      companyPhone: '1133334444',
      addressStreet: 'Av. Paulista',
      addressNumber: '1000',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZip: '01310100',
      status: PJStatus.APPROVED,
    },
  })
  console.log(`  Created/Updated: ${approvedPJ.legalName} (APPROVED)`)

  // Pending company
  const pendingPJ = await prisma.profilePJ.upsert({
    where: { cnpj: '98765432000111' },
    update: { status: PJStatus.PENDING_REVIEW },
    create: {
      pfId: buyerPFPendingId,
      legalName: 'Empresa Pendente ME',
      cnpj: '98765432000111',
      companyEmail: 'contato@pendente.com.br',
      companyPhone: '1144445555',
      status: PJStatus.PENDING_REVIEW,
    },
  })
  console.log(`  Created/Updated: ${pendingPJ.legalName} (PENDING_REVIEW)`)

  console.log('')

  // ============================================
  // 3. CREATE COTAS
  // ============================================
  console.log('📄 Creating cotas...')

  // Delete existing cotas from seller to recreate fresh
  await prisma.cota.deleteMany({ where: { sellerId } })

  const cotasData = [
    { admin: 'Bradesco Consórcio', credit: 250000, status: CotaStatus.AVAILABLE },
    { admin: 'Itaú Consórcio', credit: 350000, status: CotaStatus.AVAILABLE },
    { admin: 'Porto Seguro Consórcio', credit: 180000, status: CotaStatus.AVAILABLE },
    { admin: 'Rodobens Consórcio', credit: 420000, status: CotaStatus.AVAILABLE },
    { admin: 'Caixa Consórcio', credit: 300000, status: CotaStatus.RESERVED }, // Has approved proposal
    { admin: 'Santander Consórcio', credit: 275000, status: CotaStatus.AVAILABLE }, // Has pending proposal
    { admin: 'Embracon Consórcio', credit: 500000, status: CotaStatus.AVAILABLE },
    { admin: 'Gazin Consórcio', credit: 150000, status: CotaStatus.SOLD },
  ]

  const createdCotas: { id: string; administrator: string; creditAmount: number; status: CotaStatus }[] = []

  for (const cotaConfig of cotasData) {
    const cotaData = generateCotaData(sellerId, cotaConfig.admin, cotaConfig.credit, cotaConfig.status)
    const cota = await prisma.cota.create({ data: cotaData })
    createdCotas.push({
      id: cota.id,
      administrator: cota.administrator,
      creditAmount: Number(cota.creditAmount),
      status: cota.status,
    })
    console.log(`  Created: ${cotaConfig.admin} - R$ ${cotaConfig.credit.toLocaleString('pt-BR')} (${cotaConfig.status})`)
  }

  console.log('')

  // ============================================
  // 4. CREATE PROPOSALS
  // ============================================
  console.log('📝 Creating proposals...')

  // Delete existing proposals
  await prisma.proposal.deleteMany({})

  // Proposal 1: APPROVED (for reserved cota - Caixa)
  const reservedCota = createdCotas.find(c => c.status === CotaStatus.RESERVED)!
  const proposal1 = await prisma.proposal.create({
    data: {
      cotaId: reservedCota.id,
      buyerPfId: buyerPFId,
      buyerType: BuyerType.PF,
      buyerEntityId: buyerPFId,
      status: ProposalStatus.APPROVED,
      transferFee: 2500,
    },
  })
  console.log(`  Created: Proposal APPROVED (${reservedCota.administrator})`)

  // Proposal 2: PRE_APPROVED (waiting for docs - Santander)
  const santanderCota = createdCotas.find(c => c.administrator === 'Santander Consórcio')!
  await prisma.proposal.create({
    data: {
      cotaId: santanderCota.id,
      buyerPfId: buyerPFId,
      buyerType: BuyerType.PJ,
      buyerEntityId: approvedPJ.id,
      status: ProposalStatus.PRE_APPROVED,
    },
  })
  console.log(`  Created: Proposal PRE_APPROVED (${santanderCota.administrator}) - PJ buyer`)

  // Proposal 3: UNDER_REVIEW (new proposal - Embracon)
  const embraconCota = createdCotas.find(c => c.administrator === 'Embracon Consórcio')!
  await prisma.proposal.create({
    data: {
      cotaId: embraconCota.id,
      buyerPfId: buyerPFPendingId,
      buyerType: BuyerType.PF,
      buyerEntityId: buyerPFPendingId,
      status: ProposalStatus.UNDER_REVIEW,
    },
  })
  console.log(`  Created: Proposal UNDER_REVIEW (${embraconCota.administrator}) - pending buyer`)

  // Proposal 4: REJECTED
  const itauCota = createdCotas.find(c => c.administrator === 'Itaú Consórcio')!
  const proposal4 = await prisma.proposal.create({
    data: {
      cotaId: itauCota.id,
      buyerPfId: buyerPFId,
      buyerType: BuyerType.PF,
      buyerEntityId: buyerPFId,
      status: ProposalStatus.REJECTED,
      rejectionReason: 'Documentação incompleta. Por favor, envie comprovante de renda atualizado.',
    },
  })
  console.log(`  Created: Proposal REJECTED (${itauCota.administrator})`)

  // Proposal 5: COMPLETED (for sold cota)
  const soldCota = createdCotas.find(c => c.status === CotaStatus.SOLD)!
  const proposal5 = await prisma.proposal.create({
    data: {
      cotaId: soldCota.id,
      buyerPfId: buyerPFId,
      buyerType: BuyerType.PF,
      buyerEntityId: buyerPFId,
      status: ProposalStatus.COMPLETED,
      transferFee: 1800,
    },
  })
  console.log(`  Created: Proposal COMPLETED (${soldCota.administrator})`)

  console.log('')

  // ============================================
  // 5. CREATE DOCUMENTS
  // ============================================
  console.log('📎 Creating documents...')

  // Delete existing documents
  await prisma.document.deleteMany({})

  // Documents for approved buyer PF
  const pfDocuments = [
    { type: DocumentType.PF_RG, status: DocumentStatus.APPROVED, name: 'rg_maria.pdf' },
    { type: DocumentType.PF_CPF, status: DocumentStatus.APPROVED, name: 'cpf_maria.pdf' },
    { type: DocumentType.PF_INCOME_TAX, status: DocumentStatus.APPROVED, name: 'irpf_maria.pdf' },
  ]

  for (const doc of pfDocuments) {
    await prisma.document.create({
      data: {
        ownerId: buyerPFId,
        ownerType: OwnerType.PF,
        documentType: doc.type,
        fileUrl: `https://storage.example.com/docs/${doc.name}`,
        fileName: doc.name,
        status: doc.status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    })
  }
  console.log(`  Created: 3 PF documents for approved buyer (APPROVED)`)

  // Documents for pending buyer PF
  const pendingDocs = [
    { type: DocumentType.PF_RG, status: DocumentStatus.UNDER_REVIEW, name: 'rg_joao.pdf' },
    { type: DocumentType.PF_CPF, status: DocumentStatus.PENDING_UPLOAD, name: 'cpf_joao.pdf' },
  ]

  for (const doc of pendingDocs) {
    await prisma.document.create({
      data: {
        ownerId: buyerPFPendingId,
        ownerType: OwnerType.PF,
        documentType: doc.type,
        fileUrl: doc.status === DocumentStatus.PENDING_UPLOAD ? '' : `https://storage.example.com/docs/${doc.name}`,
        fileName: doc.name,
        status: doc.status,
      },
    })
  }
  console.log(`  Created: 2 PF documents for pending buyer (UNDER_REVIEW, PENDING_UPLOAD)`)

  // Documents for approved PJ
  const pjDocuments = [
    { type: DocumentType.PJ_ARTICLES_OF_INCORPORATION, status: DocumentStatus.APPROVED, name: 'contrato_social.pdf' },
    { type: DocumentType.PJ_PROOF_OF_ADDRESS, status: DocumentStatus.APPROVED, name: 'comprovante_endereco_pj.pdf' },
  ]

  for (const doc of pjDocuments) {
    await prisma.document.create({
      data: {
        ownerId: approvedPJ.id,
        ownerType: OwnerType.PJ,
        documentType: doc.type,
        fileUrl: `https://storage.example.com/docs/${doc.name}`,
        fileName: doc.name,
        status: doc.status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    })
  }
  console.log(`  Created: 2 PJ documents for approved company (APPROVED)`)

  // Cota statement for reserved cota (APPROVED)
  await prisma.document.create({
    data: {
      ownerId: reservedCota.id,
      ownerType: OwnerType.COTA,
      documentType: DocumentType.COTA_STATEMENT,
      fileUrl: 'https://storage.example.com/docs/extrato_caixa.pdf',
      fileName: 'extrato_caixa.pdf',
      status: DocumentStatus.APPROVED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  })
  console.log(`  Created: Cota statement for ${reservedCota.administrator} (APPROVED)`)

  // Cota statement for santander (UNDER_REVIEW - blocking approval)
  await prisma.document.create({
    data: {
      ownerId: santanderCota.id,
      ownerType: OwnerType.COTA,
      documentType: DocumentType.COTA_STATEMENT,
      fileUrl: 'https://storage.example.com/docs/extrato_santander.pdf',
      fileName: 'extrato_santander.pdf',
      status: DocumentStatus.UNDER_REVIEW,
    },
  })
  console.log(`  Created: Cota statement for ${santanderCota.administrator} (UNDER_REVIEW - blocking proposal approval)`)

  // Cota statement REJECTED example
  await prisma.document.create({
    data: {
      ownerId: itauCota.id,
      ownerType: OwnerType.COTA,
      documentType: DocumentType.COTA_STATEMENT,
      fileUrl: 'https://storage.example.com/docs/extrato_itau.pdf',
      fileName: 'extrato_itau.pdf',
      status: DocumentStatus.REJECTED,
      rejectionReason: 'Documento ilegível. Por favor, envie uma cópia com melhor qualidade.',
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  })
  console.log(`  Created: Cota statement for ${itauCota.administrator} (REJECTED)`)

  console.log('')

  // ============================================
  // 6. CREATE PROPOSAL HISTORY
  // ============================================
  console.log('📜 Creating proposal history...')

  // History for approved proposal
  await prisma.proposalHistory.createMany({
    data: [
      { proposalId: proposal1.id, oldStatus: null, newStatus: ProposalStatus.UNDER_REVIEW, changedBy: buyerPFId, notes: 'Proposta criada' },
      { proposalId: proposal1.id, oldStatus: ProposalStatus.UNDER_REVIEW, newStatus: ProposalStatus.PRE_APPROVED, changedBy: adminId, notes: 'Documentos do comprador verificados' },
      { proposalId: proposal1.id, oldStatus: ProposalStatus.PRE_APPROVED, newStatus: ProposalStatus.APPROVED, changedBy: adminId, notes: 'Extrato da cota aprovado. Proposta aprovada.' },
    ],
  })
  console.log(`  Created: 3 history entries for approved proposal`)

  // History for rejected proposal
  await prisma.proposalHistory.createMany({
    data: [
      { proposalId: proposal4.id, oldStatus: null, newStatus: ProposalStatus.UNDER_REVIEW, changedBy: buyerPFId, notes: 'Proposta criada' },
      { proposalId: proposal4.id, oldStatus: ProposalStatus.UNDER_REVIEW, newStatus: ProposalStatus.REJECTED, changedBy: adminId, notes: 'Documentação incompleta' },
    ],
  })
  console.log(`  Created: 2 history entries for rejected proposal`)

  // History for completed proposal
  await prisma.proposalHistory.createMany({
    data: [
      { proposalId: proposal5.id, oldStatus: null, newStatus: ProposalStatus.UNDER_REVIEW, changedBy: buyerPFId },
      { proposalId: proposal5.id, oldStatus: ProposalStatus.UNDER_REVIEW, newStatus: ProposalStatus.PRE_APPROVED, changedBy: adminId },
      { proposalId: proposal5.id, oldStatus: ProposalStatus.PRE_APPROVED, newStatus: ProposalStatus.APPROVED, changedBy: adminId },
      { proposalId: proposal5.id, oldStatus: ProposalStatus.APPROVED, newStatus: ProposalStatus.TRANSFER_STARTED, changedBy: adminId, notes: 'Pagamento confirmado. Transferência iniciada.' },
      { proposalId: proposal5.id, oldStatus: ProposalStatus.TRANSFER_STARTED, newStatus: ProposalStatus.COMPLETED, changedBy: adminId, notes: 'Transferência concluída com sucesso!' },
    ],
  })
  console.log(`  Created: 5 history entries for completed proposal`)

  console.log('')

  // ============================================
  // SUMMARY
  // ============================================
  console.log('=' .repeat(60))
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!')
  console.log('=' .repeat(60))
  console.log('')
  console.log('📧 TEST ACCOUNTS:')
  console.log('')
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ ADMIN (can approve/reject proposals and documents)         │')
  console.log('├─────────────────────────────────────────────────────────────┤')
  console.log(`│ Email:    ${testUsers.admin.email.padEnd(45)}│`)
  console.log(`│ Password: ${testUsers.admin.password.padEnd(45)}│`)
  console.log('└─────────────────────────────────────────────────────────────┘')
  console.log('')
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ SELLER (has cotas to sell)                                  │')
  console.log('├─────────────────────────────────────────────────────────────┤')
  console.log(`│ Email:    ${testUsers.seller.email.padEnd(45)}│`)
  console.log(`│ Password: ${testUsers.seller.password.padEnd(45)}│`)
  console.log('└─────────────────────────────────────────────────────────────┘')
  console.log('')
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ BUYER PF APPROVED (can buy cotas)                           │')
  console.log('├─────────────────────────────────────────────────────────────┤')
  console.log(`│ Email:    ${testUsers.buyerPF.email.padEnd(45)}│`)
  console.log(`│ Password: ${testUsers.buyerPF.password.padEnd(45)}│`)
  console.log('└─────────────────────────────────────────────────────────────┘')
  console.log('')
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ BUYER PF PENDING (documents under review)                   │')
  console.log('├─────────────────────────────────────────────────────────────┤')
  console.log(`│ Email:    ${testUsers.buyerPFPending.email.padEnd(45)}│`)
  console.log(`│ Password: ${testUsers.buyerPFPending.password.padEnd(45)}│`)
  console.log('└─────────────────────────────────────────────────────────────┘')
  console.log('')
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ BUYER PF INCOMPLETE (needs to complete profile)             │')
  console.log('├─────────────────────────────────────────────────────────────┤')
  console.log(`│ Email:    ${testUsers.buyerPFIncomplete.email.padEnd(45)}│`)
  console.log(`│ Password: ${testUsers.buyerPFIncomplete.password.padEnd(45)}│`)
  console.log('└─────────────────────────────────────────────────────────────┘')
  console.log('')
  console.log('📊 DATA SUMMARY:')
  console.log(`   • ${cotasData.length} cotas (various statuses)`)
  console.log(`   • 5 proposals (UNDER_REVIEW, PRE_APPROVED, APPROVED, REJECTED, COMPLETED)`)
  console.log(`   • 2 companies (1 APPROVED, 1 PENDING_REVIEW)`)
  console.log(`   • Multiple documents (APPROVED, UNDER_REVIEW, REJECTED, PENDING_UPLOAD)`)
  console.log('')
  console.log('🔒 BUSINESS RULES DEMO:')
  console.log('   • PRE_APPROVED → APPROVED requires:')
  console.log('     1. Approved cota statement document')
  console.log('     2. Approved buyer entity (PF or PJ)')
  console.log('')
  console.log('   The Santander proposal (PRE_APPROVED) cannot be approved because')
  console.log('   the cota statement is still UNDER_REVIEW.')
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
