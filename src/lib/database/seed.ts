import { PrismaClient, CotaStatus, PFStatus, PJStatus, ProposalStatus, DocumentStatus, BuyerType, OwnerType, DocumentType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { realCotasData } from './cotas-data'

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

// ============================================
// CONSTANTS
// ============================================

const ADMINISTRATORS = [
  'Bradesco Consórcios',
  'Itaú Consórcios',
  'Caixa Consórcios',
  'Santander Consórcios',
  'BB Consórcios',
  'Porto Seguro Consórcios',
  'Rodobens Consórcios',
  'Embracon',
  'Magalu Consórcios',
  'Consórcio Nacional Honda',
  'Consórcio Volkswagen',
  'Consórcio Fiat',
  'Consórcio GM (Chevrolet)',
]

// Realistic Brazilian seller accounts
const sellers = [
  {
    email: 'joao.silva.vendas@gmail.com',
    password: 'Senha@123',
    name: 'João da Silva',
    phone: '11987654321',
    cpf: '12345678901',
  },
  {
    email: 'maria.santos.sp@gmail.com',
    password: 'Senha@123',
    name: 'Maria Santos',
    phone: '11976543210',
    cpf: '23456789012',
  },
  {
    email: 'pedro.oliveira.rj@gmail.com',
    password: 'Senha@123',
    name: 'Pedro Oliveira',
    phone: '11965432109',
    cpf: '34567890123',
  },
  {
    email: 'ana.costa.mg@gmail.com',
    password: 'Senha@123',
    name: 'Ana Costa',
    phone: '11954321098',
    cpf: '45678901234',
  },
]

// Test user configurations
const testUsers = {
  buyerPF: {
    email: 'carla.ferreira.sp@gmail.com',
    password: 'Demo123!',
    name: 'Carla Ferreira',
    phone: '11988776655',
    cpf: '98765432100',
    status: PFStatus.APPROVED,
  },
  buyerPFPending: {
    email: 'rafael.mendes.rj@gmail.com',
    password: 'Demo123!',
    name: 'Rafael Mendes',
    phone: '11977665544',
    cpf: '11122233344',
    status: PFStatus.PENDING_REVIEW,
  },
  buyerPFIncomplete: {
    email: 'lucas.almeida.mg@gmail.com',
    password: 'Demo123!',
    name: 'Lucas Almeida',
    phone: '11966554433',
    cpf: null,
    status: PFStatus.INCOMPLETE,
  },
  admin: {
    email: 'admin@consorciomarket.com.br',
    password: 'Admin@123',
    name: 'Administrador Sistema',
    phone: '11955443322',
    cpf: '00000000000',
    status: PFStatus.APPROVED,
    role: 'ADMIN' as const,
  },
}

// Additional admin account (from create-admin.ts)
const additionalAdmin = {
  email: 'Luizadeffernandes@gmail.com',
  password: 'Admin123!',
  name: 'Luiza Deffernandes',
  phone: '',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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

async function createAdminAccount(email: string, password: string, name: string, phone: string) {
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let userId: string

  const existingUser = existingUsers?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (existingUser) {
    console.log(`  Admin exists: ${email}`)
    userId = existingUser.id

    await prisma.profilePF.upsert({
      where: { id: userId },
      update: {
        role: 'ADMIN',
        status: PFStatus.APPROVED,
      },
      create: {
        id: userId,
        email: email,
        fullName: name,
        phone: phone,
        role: 'ADMIN',
        status: PFStatus.APPROVED,
      },
    })
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    })

    if (error) {
      console.error(`Error creating admin ${email}:`, error)
      throw error
    }

    userId = newUser.user.id
    console.log(`  Created admin: ${email}`)

    await prisma.profilePF.create({
      data: {
        id: userId,
        email: email,
        fullName: name,
        phone: phone,
        role: 'ADMIN',
        status: PFStatus.APPROVED,
      },
    })
  }

  return userId
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedAdministrators() {
  console.log('🏛️  Seeding administrators...')

  for (const name of ADMINISTRATORS) {
    const existing = await prisma.administrator.findUnique({
      where: { name },
    })

    if (existing) {
      console.log(`  - ${name} (already exists)`)
    } else {
      await prisma.administrator.create({
        data: { name },
      })
      console.log(`  + ${name} (created)`)
    }
  }

  console.log('')
}

async function seedUsers() {
  console.log('👤 Creating users...')

  // Create sellers
  const sellerIds: string[] = []
  for (const seller of sellers) {
    const sellerId = await getOrCreateUser({
      ...seller,
      status: PFStatus.APPROVED,
    })
    sellerIds.push(sellerId)
  }

  const buyerPFId = await getOrCreateUser(testUsers.buyerPF)
  const buyerPFPendingId = await getOrCreateUser(testUsers.buyerPFPending)
  await getOrCreateUser(testUsers.buyerPFIncomplete)
  const adminId = await getOrCreateUser(testUsers.admin)

  // Create additional admin account
  await createAdminAccount(
    additionalAdmin.email,
    additionalAdmin.password,
    additionalAdmin.name,
    additionalAdmin.phone
  )

  console.log('')

  return { sellerIds, buyerPFId, buyerPFPendingId, adminId }
}

async function seedCompanies(buyerPFId: string, buyerPFPendingId: string) {
  console.log('🏢 Creating company profiles...')

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

  return { approvedPJ, pendingPJ }
}

async function seedCotas(sellerIds: string[]) {
  console.log('📄 Creating cotas from real client data...')

  await prisma.cota.deleteMany({})

  const createdCotas: { id: string; administrator: string; creditAmount: number; status: CotaStatus }[] = []

  for (let i = 0; i < realCotasData.length; i++) {
    const cotaData = realCotasData[i]
    const sellerId = sellerIds[i % sellerIds.length]

    const cota = await prisma.cota.create({
      data: {
        sellerId,
        administrator: cotaData.administrator,
        cotaNumber: `COTA-${String(i + 1).padStart(4, '0')}`,
        cotaGroup: `GRP-${String(Math.floor(i / 10) + 1).padStart(3, '0')}`,
        creditAmount: cotaData.creditAmount.toString(),
        outstandingBalance: cotaData.outstandingBalance.toString(),
        nInstallments: cotaData.nInstallments,
        installmentValue: cotaData.installmentValue.toString(),
        entryAmount: cotaData.entryAmount.toString(),
        entryPercentage: cotaData.entryPercentage.toString(),
        monthlyRate: cotaData.monthlyRate ? cotaData.monthlyRate.toString() : null,
        status: CotaStatus.AVAILABLE,
      },
    })

    createdCotas.push({
      id: cota.id,
      administrator: cota.administrator,
      creditAmount: Number(cota.creditAmount),
      status: cota.status,
    })
  }

  console.log(`  Created: ${realCotasData.length} cotas from Caixa Consórcios`)
  console.log(`  Distributed among ${sellerIds.length} sellers`)
  console.log('')

  return createdCotas
}

async function seedProposals(
  createdCotas: { id: string; administrator: string; creditAmount: number; status: CotaStatus }[],
  buyerPFId: string,
  buyerPFPendingId: string,
  approvedPJId: string
) {
  console.log('📝 Creating sample proposals...')

  await prisma.proposal.deleteMany({})

  const sampleCota1 = createdCotas[0]
  const sampleCota2 = createdCotas[1]
  const sampleCota3 = createdCotas[2]

  const proposal1 = await prisma.proposal.create({
    data: {
      cotaId: sampleCota1.id,
      buyerPfId: buyerPFId,
      buyerType: BuyerType.PF,
      buyerEntityId: buyerPFId,
      status: ProposalStatus.UNDER_REVIEW,
    },
  })
  console.log(`  Created: Proposal UNDER_REVIEW (${sampleCota1.administrator})`)

  await prisma.proposal.create({
    data: {
      cotaId: sampleCota2.id,
      buyerPfId: buyerPFId,
      buyerType: BuyerType.PJ,
      buyerEntityId: approvedPJId,
      status: ProposalStatus.PRE_APPROVED,
    },
  })
  console.log(`  Created: Proposal PRE_APPROVED (${sampleCota2.administrator}) - PJ buyer`)

  const proposal3 = await prisma.proposal.create({
    data: {
      cotaId: sampleCota3.id,
      buyerPfId: buyerPFPendingId,
      buyerType: BuyerType.PF,
      buyerEntityId: buyerPFPendingId,
      status: ProposalStatus.REJECTED,
      rejectionReason: 'Documentação incompleta. Por favor, envie comprovante de renda atualizado.',
    },
  })
  console.log(`  Created: Proposal REJECTED (${sampleCota3.administrator})`)

  console.log('')

  return { proposal1, proposal3, sampleCota1, sampleCota2 }
}

async function seedDocuments(
  buyerPFId: string,
  buyerPFPendingId: string,
  approvedPJId: string,
  adminId: string,
  sampleCota1Id: string,
  sampleCota2Id: string
) {
  console.log('📎 Creating sample documents...')

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
        ownerId: approvedPJId,
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

  // Sample cota statements
  await prisma.document.create({
    data: {
      ownerId: sampleCota1Id,
      ownerType: OwnerType.COTA,
      documentType: DocumentType.COTA_STATEMENT,
      fileUrl: 'https://storage.example.com/docs/extrato_caixa_1.pdf',
      fileName: 'extrato_caixa_1.pdf',
      status: DocumentStatus.UNDER_REVIEW,
    },
  })
  console.log(`  Created: Cota statement for sample cota 1 (UNDER_REVIEW)`)

  await prisma.document.create({
    data: {
      ownerId: sampleCota2Id,
      ownerType: OwnerType.COTA,
      documentType: DocumentType.COTA_STATEMENT,
      fileUrl: 'https://storage.example.com/docs/extrato_caixa_2.pdf',
      fileName: 'extrato_caixa_2.pdf',
      status: DocumentStatus.APPROVED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  })
  console.log(`  Created: Cota statement for sample cota 2 (APPROVED)`)

  console.log('')
}

async function seedProposalHistory(
  proposal1Id: string,
  proposal3Id: string,
  buyerPFId: string,
  buyerPFPendingId: string,
  adminId: string
) {
  console.log('📜 Creating proposal history...')

  await prisma.proposalHistory.createMany({
    data: [
      { proposalId: proposal1Id, oldStatus: null, newStatus: ProposalStatus.UNDER_REVIEW, changedBy: buyerPFId, notes: 'Proposta criada' },
    ],
  })
  console.log(`  Created: 1 history entry for UNDER_REVIEW proposal`)

  await prisma.proposalHistory.createMany({
    data: [
      { proposalId: proposal3Id, oldStatus: null, newStatus: ProposalStatus.UNDER_REVIEW, changedBy: buyerPFPendingId, notes: 'Proposta criada' },
      { proposalId: proposal3Id, oldStatus: ProposalStatus.UNDER_REVIEW, newStatus: ProposalStatus.REJECTED, changedBy: adminId, notes: 'Documentação incompleta' },
    ],
  })
  console.log(`  Created: 2 history entries for rejected proposal`)

  console.log('')
}

function printSummary() {
  console.log('=' .repeat(60))
  console.log('SEED COMPLETED SUCCESSFULLY!')
  console.log('=' .repeat(60))
  console.log('')
  console.log('TEST ACCOUNTS:')
  console.log('')
  console.log('ADMIN (can approve/reject proposals and documents)')
  console.log('-'.repeat(50))
  console.log(`Email:    ${testUsers.admin.email}`)
  console.log(`Password: ${testUsers.admin.password}`)
  console.log('')
  console.log('ADDITIONAL ADMIN')
  console.log('-'.repeat(50))
  console.log(`Email:    ${additionalAdmin.email}`)
  console.log(`Password: ${additionalAdmin.password}`)
  console.log('')
  console.log('SELLERS (have cotas to sell)')
  console.log('-'.repeat(50))
  for (const seller of sellers) {
    console.log(`Email:    ${seller.email}`)
    console.log(`Password: ${seller.password}`)
    console.log('')
  }
  console.log('BUYER PF APPROVED (can buy cotas)')
  console.log('-'.repeat(50))
  console.log(`Email:    ${testUsers.buyerPF.email}`)
  console.log(`Password: ${testUsers.buyerPF.password}`)
  console.log('')
  console.log('BUYER PF PENDING (documents under review)')
  console.log('-'.repeat(50))
  console.log(`Email:    ${testUsers.buyerPFPending.email}`)
  console.log(`Password: ${testUsers.buyerPFPending.password}`)
  console.log('')
  console.log('BUYER PF INCOMPLETE (needs to complete profile)')
  console.log('-'.repeat(50))
  console.log(`Email:    ${testUsers.buyerPFIncomplete.email}`)
  console.log(`Password: ${testUsers.buyerPFIncomplete.password}`)
  console.log('')
  console.log('DATA SUMMARY:')
  console.log(`   - ${realCotasData.length} real cotas from Caixa Consórcios (all AVAILABLE)`)
  console.log(`   - Distributed among ${sellers.length} sellers`)
  console.log(`   - 3 sample proposals (UNDER_REVIEW, PRE_APPROVED, REJECTED)`)
  console.log(`   - 2 companies (1 APPROVED, 1 PENDING_REVIEW)`)
  console.log(`   - Multiple documents (APPROVED, UNDER_REVIEW, PENDING_UPLOAD)`)
  console.log(`   - ${ADMINISTRATORS.length} consortium administrators`)
  console.log('')
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('Starting comprehensive seed...\n')

  // 1. Seed administrators
  await seedAdministrators()

  // 2. Create users
  const { sellerIds, buyerPFId, buyerPFPendingId, adminId } = await seedUsers()

  // 3. Create companies
  const { approvedPJ } = await seedCompanies(buyerPFId, buyerPFPendingId)

  // 4. Create cotas
  const createdCotas = await seedCotas(sellerIds)

  // 5. Create proposals
  const { proposal1, proposal3, sampleCota1, sampleCota2 } = await seedProposals(
    createdCotas,
    buyerPFId,
    buyerPFPendingId,
    approvedPJ.id
  )

  // 6. Create documents
  await seedDocuments(
    buyerPFId,
    buyerPFPendingId,
    approvedPJ.id,
    adminId,
    sampleCota1.id,
    sampleCota2.id
  )

  // 7. Create proposal history
  await seedProposalHistory(proposal1.id, proposal3.id, buyerPFId, buyerPFPendingId, adminId)

  // 8. Print summary
  printSummary()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
