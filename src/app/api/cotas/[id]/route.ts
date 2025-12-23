import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    // Use admin client to bypass RLS for database operations
    let adminSupabase
    try {
      adminSupabase = createAdminClient()
    } catch (err) {
      console.error('Failed to create admin client:', err)
      return NextResponse.json(
        { error: 'Erro de configuração do servidor' },
        { status: 500 }
      )
    }

    // Get current cota
    const { data: cota, error: cotaError } = await adminSupabase
      .from('cotas')
      .select('*')
      .eq('id', id)
      .single()

    if (cotaError) {
      console.error('Error fetching cota:', cotaError)
      return NextResponse.json(
        { error: `Cota não encontrada: ${cotaError.message}` },
        { status: 404 }
      )
    }

    if (!cota) {
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

    // Update cota using admin client
    const { data: updatedCota, error: updateError } = await adminSupabase
      .from('cotas')
      .update(updateData)
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('Error updating cota:', updateError)
      return NextResponse.json(
        { error: `Erro ao atualizar cota: ${updateError.message}` },
        { status: 500 }
      )
    }

    if (!updatedCota || updatedCota.length === 0) {
      console.error('Cota update returned no data - RLS may be blocking the update')
      return NextResponse.json(
        { error: 'Erro ao atualizar cota: permissão negada pelo RLS' },
        { status: 403 }
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

    await adminSupabase.from('cota_history').insert(historyEntries)

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
