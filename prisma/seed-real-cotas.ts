import { PrismaClient, CotaStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Real cotas data from client's spreadsheet
const realCotasData = [
  { credit: 1905000, entry: 805000, admin: 'Caixa Consórcios', installments: 187, installmentValue: 8920, rate: 0.48, entryPercent: 42.26, balance: 1668040 },
  { credit: 385000, entry: 178500, admin: 'Caixa Consórcios', installments: 152, installmentValue: 2202, rate: 0.69, entryPercent: 46.36, balance: 334704 },
  { credit: 470000, entry: 189800, admin: 'Caixa Consórcios', installments: 187, installmentValue: 2720, rate: 0.71, entryPercent: 40.38, balance: 508640 },
  { credit: 57200, entry: 25700, admin: 'Caixa Consórcios', installments: 155, installmentValue: 343, rate: 0.74, entryPercent: 44.93, balance: 53165 },
  { credit: 342000, entry: 143800, admin: 'Caixa Consórcios', installments: 161, installmentValue: 2121, rate: 0.75, entryPercent: 42.05, balance: 341481 },
  { credit: 105300, entry: 43500, admin: 'Caixa Consórcios', installments: 181, installmentValue: 632, rate: 0.77, entryPercent: 41.31, balance: 114392 },
  { credit: 1200000, entry: 495000, admin: 'Caixa Consórcios', installments: 187, installmentValue: 7195, rate: 0.78, entryPercent: 41.25, balance: 1345465 },
  { credit: 90100, entry: 34500, admin: 'Caixa Consórcios', installments: 154, installmentValue: 631, rate: 0.80, entryPercent: 38.29, balance: 97174 },
  { credit: 156000, entry: 71000, admin: 'Caixa Consórcios', installments: 180, installmentValue: 890, rate: 0.80, entryPercent: 45.51, balance: 160200 },
  { credit: 157300, entry: 66500, admin: 'Caixa Consórcios', installments: 179, installmentValue: 967, rate: 0.82, entryPercent: 42.28, balance: 173093 },
  { credit: 731000, entry: 305000, admin: 'Caixa Consórcios', installments: 187, installmentValue: 4475, rate: 0.82, entryPercent: 41.72, balance: 836825 },
  { credit: 570000, entry: 269800, admin: 'Caixa Consórcios', installments: 176, installmentValue: 3275, rate: 0.84, entryPercent: 47.33, balance: 576400 },
  { credit: 572000, entry: 253500, admin: 'Caixa Consórcios', installments: 159, installmentValue: 3670, rate: 0.85, entryPercent: 44.32, balance: 583530 },
  { credit: 106000, entry: 46500, admin: 'Caixa Consórcios', installments: 184, installmentValue: 645, rate: 0.86, entryPercent: 43.87, balance: 118680 },
  { credit: 58600, entry: 26000, admin: 'Caixa Consórcios', installments: 157, installmentValue: 382, rate: 0.87, entryPercent: 44.37, balance: 59974 },
  { credit: 116500, entry: 49500, admin: 'Caixa Consórcios', installments: 154, installmentValue: 790, rate: 0.87, entryPercent: 42.49, balance: 121660 },
  { credit: 355000, entry: 154800, admin: 'Caixa Consórcios', installments: 188, installmentValue: 2167, rate: 0.87, entryPercent: 43.61, balance: 407396 },
  { credit: 87400, entry: 35000, admin: 'Caixa Consórcios', installments: 155, installmentValue: 620, rate: 0.88, entryPercent: 40.05, balance: 96100 },
  { credit: 705000, entry: 295800, admin: 'Caixa Consórcios', installments: 188, installmentValue: 4445, rate: 0.88, entryPercent: 41.96, balance: 835660 },
  { credit: 900000, entry: 405800, admin: 'Caixa Consórcios', installments: 199, installmentValue: 5270, rate: 0.88, entryPercent: 45.09, balance: 1048730 },
  { credit: 101500, entry: 43000, admin: 'Caixa Consórcios', installments: 197, installmentValue: 632, rate: 0.89, entryPercent: 42.36, balance: 124504 },
  { credit: 70000, entry: 32500, admin: 'Caixa Consórcios', installments: 159, installmentValue: 447, rate: 0.91, entryPercent: 46.43, balance: 71073 },
  { credit: 113500, entry: 45500, admin: 'Caixa Consórcios', installments: 196, installmentValue: 744, rate: 0.91, entryPercent: 40.09, balance: 145824 },
  { credit: 125600, entry: 53000, admin: 'Caixa Consórcios', installments: 158, installmentValue: 868, rate: 0.91, entryPercent: 42.20, balance: 137144 },
  { credit: 304000, entry: 141800, admin: 'Caixa Consórcios', installments: 179, installmentValue: 1842, rate: 0.91, entryPercent: 46.64, balance: 329718 },
  { credit: 378000, entry: 148800, admin: 'Caixa Consórcios', installments: 196, installmentValue: 2504, rate: 0.91, entryPercent: 39.37, balance: 490784 },
  { credit: 124700, entry: 52000, admin: 'Caixa Consórcios', installments: 158, installmentValue: 882, rate: 0.93, entryPercent: 41.70, balance: 139356 },
  { credit: 209000, entry: 89800, admin: 'Caixa Consórcios', installments: 187, installmentValue: 1346, rate: 0.93, entryPercent: 42.97, balance: 251702 },
  { credit: 630000, entry: 272800, admin: 'Caixa Consórcios', installments: 161, installmentValue: 4283, rate: 0.93, entryPercent: 43.30, balance: 689563 },
  { credit: 113800, entry: 37800, admin: 'Caixa Consórcios', installments: 153, installmentValue: 936, rate: 0.94, entryPercent: 33.22, balance: 143208 },
  { credit: 126000, entry: 50800, admin: 'Caixa Consórcios', installments: 156, installmentValue: 922, rate: 0.94, entryPercent: 40.32, balance: 143832 },
  { credit: 249500, entry: 104500, admin: 'Caixa Consórcios', installments: 158, installmentValue: 1765, rate: 0.94, entryPercent: 41.88, balance: 278870 },
  { credit: 381000, entry: 158900, admin: 'Caixa Consórcios', installments: 191, installmentValue: 2504, rate: 0.94, entryPercent: 41.71, balance: 478264 },
  { credit: 500000, entry: 237500, admin: 'Caixa Consórcios', installments: 163, installmentValue: 3145, rate: 0.94, entryPercent: 47.50, balance: 512635 },
  { credit: 635000, entry: 289800, admin: 'Caixa Consórcios', installments: 185, installmentValue: 3935, rate: 0.94, entryPercent: 45.64, balance: 727975 },
  { credit: 677000, entry: 299800, admin: 'Caixa Consórcios', installments: 155, installmentValue: 4640, rate: 0.94, entryPercent: 44.28, balance: 719200 },
  { credit: 735000, entry: 325500, admin: 'Caixa Consórcios', installments: 155, installmentValue: 5025, rate: 0.94, entryPercent: 44.29, balance: 778875 },
  { credit: 153600, entry: 63500, admin: 'Caixa Consórcios', installments: 188, installmentValue: 1029, rate: 0.95, entryPercent: 41.34, balance: 193452 },
  { credit: 607000, entry: 268900, admin: 'Caixa Consórcios', installments: 155, installmentValue: 4190, rate: 0.96, entryPercent: 44.30, balance: 649450 },
  { credit: 86300, entry: 37500, admin: 'Caixa Consórcios', installments: 155, installmentValue: 609, rate: 0.97, entryPercent: 43.45, balance: 94395 },
  { credit: 400000, entry: 178800, admin: 'Caixa Consórcios', installments: 156, installmentValue: 2760, rate: 0.97, entryPercent: 44.70, balance: 430560 },
  { credit: 465000, entry: 209500, admin: 'Caixa Consórcios', installments: 154, installmentValue: 3195, rate: 0.97, entryPercent: 45.05, balance: 492030 },
  { credit: 1045000, entry: 510000, admin: 'Caixa Consórcios', installments: 157, installmentValue: 6660, rate: 0.97, entryPercent: 48.80, balance: 1045620 },
  { credit: 57100, entry: 25500, admin: 'Caixa Consórcios', installments: 157, installmentValue: 394, rate: 0.98, entryPercent: 44.66, balance: 61858 },
  { credit: 85200, entry: 36500, admin: 'Caixa Consórcios', installments: 156, installmentValue: 610, rate: 0.98, entryPercent: 42.84, balance: 95160 },
  { credit: 128500, entry: 42800, admin: 'Caixa Consórcios', installments: 156, installmentValue: 1072, rate: 0.98, entryPercent: 33.31, balance: 167232 },
  { credit: 490500, entry: 219800, admin: 'Caixa Consórcios', installments: 155, installmentValue: 3405, rate: 0.98, entryPercent: 44.81, balance: 527775 },
  { credit: 1300000, entry: 580000, admin: 'Caixa Consórcios', installments: 163, installmentValue: 8870, rate: 0.98, entryPercent: 44.62, balance: 1445810 },
  { credit: 56600, entry: 26500, admin: 'Caixa Consórcios', installments: 159, installmentValue: 376, rate: 0.99, entryPercent: 46.82, balance: 59784 },
  { credit: 542000, entry: 267500, admin: 'Caixa Consórcios', installments: 151, installmentValue: 3515, rate: 0.99, entryPercent: 49.35, balance: 530765 },
  { credit: 800000, entry: 338800, admin: 'Caixa Consórcios', installments: 163, installmentValue: 5720, rate: 0.99, entryPercent: 42.35, balance: 932360 },
  { credit: 2560000, entry: 1160000, admin: 'Caixa Consórcios', installments: 168, installmentValue: 17090, rate: 0.99, entryPercent: 45.31, balance: 2871120 },
  { credit: 257500, entry: 118800, admin: 'Caixa Consórcios', installments: 156, installmentValue: 1762, rate: 1.00, entryPercent: 46.14, balance: 274872 },
  { credit: 1925000, entry: 870000, admin: 'Caixa Consórcios', installments: 163, installmentValue: 13155, rate: 1.00, entryPercent: 45.19, balance: 2144265 },
  { credit: 2835000, entry: 1280000, admin: 'Caixa Consórcios', installments: 166, installmentValue: 19260, rate: 1.00, entryPercent: 45.15, balance: 3197160 },
  { credit: 3380000, entry: 1550000, admin: 'Caixa Consórcios', installments: 164, installmentValue: 22775, rate: 1.00, entryPercent: 45.86, balance: 3735100 },
  { credit: 90300, entry: 40500, admin: 'Caixa Consórcios', installments: 151, installmentValue: 644, rate: 1.01, entryPercent: 44.85, balance: 97244 },
  { credit: 57000, entry: 27000, admin: 'Caixa Consórcios', installments: 157, installmentValue: 383, rate: 1.02, entryPercent: 47.37, balance: 60131 },
  { credit: 57200, entry: 25500, admin: 'Caixa Consórcios', installments: 154, installmentValue: 409, rate: 1.02, entryPercent: 44.58, balance: 62986 },
  { credit: 424000, entry: 164800, admin: 'Caixa Consórcios', installments: 151, installmentValue: 3380, rate: 1.02, entryPercent: 38.87, balance: 510380 },
  { credit: 171000, entry: 81500, admin: 'Caixa Consórcios', installments: 157, installmentValue: 1155, rate: 1.03, entryPercent: 47.66, balance: 181335 },
  { credit: 348000, entry: 162500, admin: 'Caixa Consórcios', installments: 155, installmentValue: 2405, rate: 1.03, entryPercent: 46.70, balance: 372775 },
  { credit: 85600, entry: 32500, admin: 'Caixa Consórcios', installments: 158, installmentValue: 688, rate: 1.04, entryPercent: 37.97, balance: 108704 },
  { credit: 60200, entry: 27200, admin: 'Caixa Consórcios', installments: 151, installmentValue: 436, rate: 1.05, entryPercent: 45.18, balance: 65836 },
  { credit: 150400, entry: 75500, admin: 'Caixa Consórcios', installments: 151, installmentValue: 995, rate: 1.06, entryPercent: 50.20, balance: 150245 },
  { credit: 270700, entry: 138500, admin: 'Caixa Consórcios', installments: 151, installmentValue: 1757, rate: 1.06, entryPercent: 51.16, balance: 265307 },
  { credit: 270800, entry: 138700, admin: 'Caixa Consórcios', installments: 151, installmentValue: 1758, rate: 1.06, entryPercent: 51.22, balance: 265458 },
  { credit: 274000, entry: 121500, admin: 'Caixa Consórcios', installments: 148, installmentValue: 2170, rate: 1.17, entryPercent: 44.34, balance: 321160 },
]

async function main() {
  console.log('🌱 Starting real cotas import...\n')

  // Get seller ID (use existing seller from seed)
  const seller = await prisma.profilePF.findFirst({
    where: { email: 'vendedor@demo.consorciomarket.com.br' }
  })

  if (!seller) {
    console.error('❌ Seller not found. Please run the main seed first: npm run db:seed')
    process.exit(1)
  }

  console.log(`📧 Using seller: ${seller.email}`)
  console.log(`📊 Importing ${realCotasData.length} real cotas...\n`)

  // Delete existing cotas from this seller (optional - comment out to keep old data)
  const deleted = await prisma.cota.deleteMany({ where: { sellerId: seller.id } })
  console.log(`🗑️  Deleted ${deleted.count} existing cotas\n`)

  let created = 0
  for (const cota of realCotasData) {
    await prisma.cota.create({
      data: {
        sellerId: seller.id,
        administrator: cota.admin,
        creditAmount: cota.credit,
        entryAmount: cota.entry,
        entryPercentage: cota.entryPercent,
        outstandingBalance: cota.balance,
        nInstallments: cota.installments,
        installmentValue: cota.installmentValue,
        monthlyRate: cota.rate,
        status: CotaStatus.AVAILABLE,
      }
    })
    created++

    // Show progress
    if (created % 10 === 0) {
      console.log(`   Created ${created}/${realCotasData.length} cotas...`)
    }
  }

  console.log(`\n✅ Successfully imported ${created} cotas!`)
  console.log('')
  console.log('📊 SUMMARY:')
  console.log(`   • Total cotas: ${created}`)
  console.log(`   • Administrator: Caixa Consórcios`)
  console.log(`   • Status: AVAILABLE`)
  console.log(`   • Credit range: R$ ${Math.min(...realCotasData.map(c => c.credit)).toLocaleString('pt-BR')} - R$ ${Math.max(...realCotasData.map(c => c.credit)).toLocaleString('pt-BR')}`)
  console.log(`   • Rate range: ${Math.min(...realCotasData.map(c => c.rate))}% - ${Math.max(...realCotasData.map(c => c.rate))}%`)
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
