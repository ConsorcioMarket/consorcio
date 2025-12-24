import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

async function main() {
  console.log('Seeding administrators...\n')

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

  console.log('\nAdministrators seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
