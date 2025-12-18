import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CotaStatus } from '@/types/database'

const VALID_STATUSES: CotaStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'REMOVED']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      )
    }

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
        { error: 'Acesso negado. Apenas administradores podem alterar status.' },
        { status: 403 }
      )
    }

    // Get current cota
    const { data: cota, error: cotaError } = await supabase
      .from('cotas')
      .select('status')
      .eq('id', id)
      .single()

    if (cotaError || !cota) {
      return NextResponse.json(
        { error: 'Cota não encontrada' },
        { status: 404 }
      )
    }

    // Don't update if status is the same
    if (cota.status === status) {
      return NextResponse.json(
        { message: 'Status já está definido como ' + status },
        { status: 200 }
      )
    }

    // Update cota status
    const { error: updateError } = await supabase
      .from('cotas')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating cota status:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar status da cota' },
        { status: 500 }
      )
    }

    // Track change in cota_history
    await supabase.from('cota_history').insert({
      cota_id: id,
      field_changed: 'status',
      old_value: cota.status,
      new_value: status,
      changed_by: user.id,
    })

    return NextResponse.json({
      success: true,
      message: `Status alterado de ${cota.status} para ${status}`,
      oldStatus: cota.status,
      newStatus: status,
    })
  } catch (error) {
    console.error('Error in PATCH /api/cotas/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
