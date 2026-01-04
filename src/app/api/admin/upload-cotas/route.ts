import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CotaStatus } from '@/types/database'

interface CotaInput {
  creditAmount: number
  entryAmount: number
  administrator: string
  nInstallments: number
  installmentValue: number
  monthlyRate: number
  entryPercentage: number
  outstandingBalance: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles_pf')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { cotas } = await request.json() as { cotas: CotaInput[] }

    if (!cotas || !Array.isArray(cotas) || cotas.length === 0) {
      return NextResponse.json({ error: 'Nenhuma cota fornecida' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get existing cota count for numbering
    const { count } = await adminSupabase
      .from('cotas')
      .select('*', { count: 'exact', head: true })

    const startNumber = (count || 0) + 1

    // Insert all cotas with admin as seller
    const cotasToInsert = cotas.map((cota, index) => ({
      seller_id: user.id,
      administrator: cota.administrator || 'Caixa Consórcios',
      cota_number: `COTA-${String(startNumber + index).padStart(4, '0')}`,
      cota_group: `GRP-${String(Math.floor((startNumber + index - 1) / 10) + 1).padStart(3, '0')}`,
      credit_amount: cota.creditAmount,
      outstanding_balance: cota.outstandingBalance,
      n_installments: cota.nInstallments,
      installment_value: cota.installmentValue,
      entry_amount: cota.entryAmount,
      entry_percentage: cota.entryPercentage,
      monthly_rate: cota.monthlyRate,
      status: 'AVAILABLE' as CotaStatus,
    }))

    const { error: insertError } = await adminSupabase
      .from('cotas')
      .insert(cotasToInsert)

    if (insertError) {
      console.error('Error inserting cotas:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: cotas.length })
  } catch (error) {
    console.error('Error in POST /api/admin/upload-cotas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
