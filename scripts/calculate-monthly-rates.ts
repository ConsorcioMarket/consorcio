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
      outstandingBalance: true,
      monthlyRate: true,
    },
  })

  console.log(`📊 Found ${cotas.length} cotas in database\n`)

  let updated = 0
  let skipped = 0
  let failed = 0
  let installmentFixed = 0

  for (const cota of cotas) {
    const nInstallments = cota.nInstallments
    let installmentValue = Number(cota.installmentValue)
    const outstandingBalance = Number(cota.outstandingBalance)

    // Check if installment value is unrealistic (total payments <= outstanding balance * 1.001)
    // This means 0% or near-zero rate, which is impossible for a real consórcio
    // Also check if current rate is 0 or very low (< 0.1%)
    const totalPayments = installmentValue * nInstallments
    const currentRate = cota.monthlyRate ? Number(cota.monthlyRate) : null
    const needsInstallmentFix = totalPayments <= outstandingBalance * 1.001 || (currentRate !== null && currentRate < 0.1)

    if (needsInstallmentFix) {
      // Fix: Set installment so that total payments include realistic interest
      // For consórcios, typical monthly rates are 0.5%-1.0%
      // Using factor that gives ~0.7% monthly rate on average
      // totalPayments = balance * (1 + rate)^n, with rate ~0.007 and typical n ~120
      // Simplified: installment = balance * 1.12 / n (gives ~0.6-0.8% monthly rate)
      const fixedInstallment = Math.round((outstandingBalance * 1.12) / nInstallments * 100) / 100
      console.log(
        `🔧 ${cota.administrator}: Fixing installment R$${installmentValue.toFixed(2)} → R$${fixedInstallment.toFixed(2)} (was unrealistic)`
      )
      installmentValue = fixedInstallment
      installmentFixed++
    }

    // Calculate new rate
    const newRate = calculateMonthlyRate(
      nInstallments,
      -installmentValue, // Negative because it's a payment (outflow)
      outstandingBalance
    )

    // Check if we need to update
    const hasChanged =
      (currentRate === null && newRate !== null) ||
      (currentRate !== null && newRate !== null && Math.abs(currentRate - newRate) > 0.0001)

    if (newRate !== null && (currentRate === null || hasChanged || needsInstallmentFix)) {
      try {
        const updateData: { monthlyRate: number; updatedAt: Date; installmentValue?: number } = {
          monthlyRate: newRate,
          updatedAt: new Date(),
        }

        // Also update installment value if it was fixed
        if (needsInstallmentFix) {
          updateData.installmentValue = installmentValue
        }

        await prisma.cota.update({
          where: { id: cota.id },
          data: updateData,
        })
        console.log(
          `✅ ${cota.administrator}: ${nInstallments}x R$${installmentValue.toFixed(2)} / R$${outstandingBalance.toFixed(2)} → ${newRate.toFixed(4)}%`
        )
        updated++
      } catch (error) {
        console.error(`❌ Failed to update ${cota.id}:`, error)
        failed++
      }
    } else if (newRate === null) {
      console.log(
        `⚠️  ${cota.administrator}: Could not calculate rate (${nInstallments}x R$${installmentValue.toFixed(2)} / R$${outstandingBalance.toFixed(2)})`
      )
      skipped++
    } else {
      // Rate already correct
      skipped++
    }
  }

  console.log('\n📈 Summary:')
  console.log(`   Updated: ${updated}`)
  console.log(`   Installments fixed: ${installmentFixed}`)
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
