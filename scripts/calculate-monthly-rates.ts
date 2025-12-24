/**
 * Script to calculate and update monthly_rate for all cotas
 * Run with: npx ts-node scripts/calculate-monthly-rates.ts
 * Or: npx tsx scripts/calculate-monthly-rates.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Calculate monthly rate using Newton-Raphson method (equivalent to Excel RATE)
function calculateMonthlyRate(
  nPeriods: number,
  payment: number,
  presentValue: number,
  futureValue: number = 0,
  type: number = 0,
  guess: number = 0.01
): number | null {
  // Handle edge cases
  if (nPeriods <= 0 || payment >= 0 || presentValue <= 0) {
    return null
  }

  const maxIterations = 100
  const tolerance = 1e-7

  let rate = guess

  for (let i = 0; i < maxIterations; i++) {
    const f =
      presentValue * Math.pow(1 + rate, nPeriods) +
      payment * (1 + rate * type) * ((Math.pow(1 + rate, nPeriods) - 1) / rate) +
      futureValue

    const fPrime =
      presentValue * nPeriods * Math.pow(1 + rate, nPeriods - 1) +
      payment *
        (1 + rate * type) *
        ((nPeriods * Math.pow(1 + rate, nPeriods - 1) * rate - Math.pow(1 + rate, nPeriods) + 1) /
          (rate * rate)) +
      (type === 1 ? payment * ((Math.pow(1 + rate, nPeriods) - 1) / rate) : 0)

    if (fPrime === 0) {
      return null
    }

    const newRate = rate - f / fPrime

    if (Math.abs(newRate - rate) < tolerance) {
      // Return as percentage, only if positive and finite
      if (newRate > 0 && isFinite(newRate)) {
        return newRate * 100
      }
      return null
    }

    rate = newRate

    // Prevent runaway values
    if (rate < -0.99 || rate > 1) {
      return null
    }
  }

  return null
}

async function main() {
  console.log('🔄 Starting monthly rate calculation for all cotas...\n')

  // Get all cotas
  const cotas = await prisma.cota.findMany({
    select: {
      id: true,
      administrator: true,
      nInstallments: true,
      installmentValue: true,
      creditAmount: true,
      entryAmount: true,
      outstandingBalance: true,
      monthlyRate: true,
    },
  })

  console.log(`📊 Found ${cotas.length} cotas in database\n`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const cota of cotas) {
    const nInstallments = cota.nInstallments
    const installmentValue = Number(cota.installmentValue)
    const creditAmount = Number(cota.creditAmount)
    const entryAmount = Number(cota.entryAmount)
    // Present value is (credit - entry) per PRD formula: RATE(n_installments, -installment_value, credit - entry)
    const presentValue = creditAmount - entryAmount
    const currentRate = cota.monthlyRate ? Number(cota.monthlyRate) : null

    // Calculate new rate using correct formula
    const newRate = calculateMonthlyRate(
      nInstallments,
      -installmentValue, // Negative because it's a payment (outflow)
      presentValue
    )

    // Check if we need to update
    const hasChanged =
      (currentRate === null && newRate !== null) ||
      (currentRate !== null && newRate !== null && Math.abs(currentRate - newRate) > 0.0001)

    if (newRate !== null && (currentRate === null || hasChanged)) {
      try {
        await prisma.cota.update({
          where: { id: cota.id },
          data: {
            monthlyRate: newRate,
            updatedAt: new Date(),
          },
        })
        console.log(
          `✅ ${cota.administrator}: ${nInstallments}x R$${installmentValue.toFixed(2)} / PV=R$${presentValue.toFixed(2)} → ${newRate.toFixed(4)}%`
        )
        updated++
      } catch (error) {
        console.error(`❌ Failed to update ${cota.id}:`, error)
        failed++
      }
    } else if (newRate === null) {
      console.log(
        `⚠️  ${cota.administrator}: Could not calculate rate (${nInstallments}x R$${installmentValue.toFixed(2)} / PV=R$${presentValue.toFixed(2)})`
      )
      skipped++
    } else {
      // Rate already correct
      skipped++
    }
  }

  console.log('\n📈 Summary:')
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Failed:  ${failed}`)
  console.log(`   Total:   ${cotas.length}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
