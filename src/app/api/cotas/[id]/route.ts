import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CotaStatus } from '@/types/database'

const VALID_STATUSES: CotaStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'REMOVED']

// Numeric fields that can be updated by admin
const NUMERIC_FIELDS = [
  'credit_amount',
  'outstanding_balance',
  'n_installments',
  'installment_value',
  'entry_amount',
  'entry_percentage',
  'monthly_rate',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, ...otherFields } = body

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles_pf')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem alterar cotas.' },
        { status: 403 }
      )
    }

    // Get current cota
    const { data: cota, error: cotaError } = await supabase
      .from('cotas')
      .select('*')
      .eq('id', id)
      .single()

    if (cotaError || !cota) {
      return NextResponse.json(
        { error: 'Cota não encontrada' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    const changes: { field: string; oldValue: string | null; newValue: string }[] = []

    // Handle status change
    if (status && VALID_STATUSES.includes(status) && cota.status !== status) {
      updateData.status = status
      changes.push({
        field: 'status',
        oldValue: cota.status,
        newValue: status,
      })
    }

    // Handle numeric field changes
    for (const field of NUMERIC_FIELDS) {
      if (field in otherFields && otherFields[field] !== undefined) {
        const newValue = Number(otherFields[field])
        const oldValue = cota[field as keyof typeof cota] as number | null

        if (!isNaN(newValue) && oldValue !== newValue) {
          updateData[field] = newValue
          changes.push({
            field,
            oldValue: oldValue?.toString() ?? null,
            newValue: newValue.toString(),
          })
        }
      }
    }

    // Handle administrator change
    if (otherFields.administrator && otherFields.administrator !== cota.administrator) {
      updateData.administrator = otherFields.administrator
      changes.push({
        field: 'administrator',
        oldValue: cota.administrator,
        newValue: otherFields.administrator,
      })
    }

    // If no changes, return early
    if (changes.length === 0) {
      return NextResponse.json(
        { message: 'Nenhuma alteração detectada' },
        { status: 200 }
      )
    }

    // Update cota
    const { error: updateError } = await supabase
      .from('cotas')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating cota:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar cota' },
        { status: 500 }
      )
    }

    // Track all changes in cota_history
    const historyEntries = changes.map(change => ({
      cota_id: id,
      field_changed: change.field,
      old_value: change.oldValue,
      new_value: change.newValue,
      changed_by: user.id,
    }))

    await supabase.from('cota_history').insert(historyEntries)

    return NextResponse.json({
      success: true,
      message: `${changes.length} campo(s) atualizado(s)`,
      changes,
    })
  } catch (error) {
    console.error('Error in PATCH /api/cotas/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
