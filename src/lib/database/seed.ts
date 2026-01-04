import { PrismaClient, CotaStatus, PFStatus, ProposalStatus, BuyerType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ADMINISTRATORS = ['Bradesco Consórcios', 'Itaú Consórcios', 'Caixa Consórcios', 'Santander Consórcios', 'Porto Seguro Consórcios', 'Rodobens Consórcios', 'Embracon']

const users = [
  { email: 'admin@consorciomarket.com.br', password: 'Admin@123', name: 'Admin Sistema', phone: '11900000001', cpf: '00000000001', role: 'ADMIN' as const },
  { email: 'vendedor@test.com', password: 'Test@123', name: 'Vendedor Teste', phone: '11900000002', cpf: '00000000002', role: 'USER' as const },
  { email: 'comprador@test.com', password: 'Test@123', name: 'Comprador Teste', phone: '11900000003', cpf: '00000000003', role: 'USER' as const },
]

const cotas = [
  { credit: 500000, entry: 200000, installments: 180, installmentValue: 3000, rate: 0.85 },
  { credit: 300000, entry: 120000, installments: 150, installmentValue: 2000, rate: 0.90 },
  { credit: 150000, entry: 60000, installments: 120, installmentValue: 1200, rate: 0.95 },
]

async function main() {
  console.log('Seeding...\n')

  // Cleanup
  await prisma.proposalHistory.deleteMany({})
  await prisma.proposal.deleteMany({})
  await prisma.document.deleteMany({})
  await prisma.cotaHistory.deleteMany({})
  await prisma.cota.deleteMany({})
  await prisma.profilePJ.deleteMany({})
  await prisma.profilePF.deleteMany({})

  // Administrators
  for (const name of ADMINISTRATORS) {
    await prisma.administrator.upsert({ where: { name }, update: {}, create: { name } })
  }
  console.log(`✓ ${ADMINISTRATORS.length} administrators`)

  // Users
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
  const userIds: string[] = []

  for (const u of users) {
    const existing = authUsers?.find(au => au.email === u.email)
    const userId = existing?.id || (await supabase.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
      user_metadata: { full_name: u.name, phone: u.phone },
    })).data.user!.id

    await prisma.profilePF.create({
      data: { id: userId, email: u.email, fullName: u.name, phone: u.phone, cpf: u.cpf, role: u.role, status: PFStatus.APPROVED },
    })
    userIds.push(userId)
  }
  const [, sellerId, buyerId] = userIds
  console.log(`✓ ${users.length} users`)

  // Cotas
  const cotaIds: string[] = []
  for (let i = 0; i < cotas.length; i++) {
    const c = cotas[i]
    const cota = await prisma.cota.create({
      data: {
        sellerId,
        administrator: ADMINISTRATORS[i],
        cotaNumber: `COTA-${String(i + 1).padStart(4, '0')}`,
        cotaGroup: 'GRP-001',
        creditAmount: String(c.credit),
        entryAmount: String(c.entry),
        outstandingBalance: String(c.credit - c.entry),
        nInstallments: c.installments,
        installmentValue: String(c.installmentValue),
        entryPercentage: String((c.entry / c.credit) * 100),
        monthlyRate: String(c.rate),
        status: CotaStatus.AVAILABLE,
      },
    })
    cotaIds.push(cota.id)
  }
  console.log(`✓ ${cotas.length} cotas`)

  // Proposal
  await prisma.proposal.create({
    data: { cotaId: cotaIds[0], buyerPfId: buyerId, buyerType: BuyerType.PF, buyerEntityId: buyerId, status: ProposalStatus.UNDER_REVIEW },
  })
  console.log('✓ 1 proposal')

  console.log('\n✅ Done!\n')
  console.log('Accounts:')
  console.log('  admin@consorciomarket.com.br / Admin@123')
  console.log('  vendedor@test.com / Test@123')
  console.log('  comprador@test.com / Test@123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
