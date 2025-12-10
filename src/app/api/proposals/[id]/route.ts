import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  UNDER_REVIEW: ['PRE_APPROVED', 'REJECTED'],
  PRE_APPROVED: ['APPROVED', 'REJECTED', 'UNDER_REVIEW'],
  APPROVED: ['TRANSFER_STARTED', 'REJECTED'],
  TRANSFER_STARTED: ['COMPLETED', 'REJECTED'],
  COMPLETED: [],
  REJECTED: ['UNDER_REVIEW'],
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles_pf')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem alterar status de propostas' }, { status: 403 })
    }

    const body = await request.json()
    const { status: newStatus, rejectionReason } = body

    if (!newStatus) {
      return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 })
    }

    // Get current proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single()

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    const currentStatus = proposal.status

    // Validate status transition
    const validNextStatuses = VALID_TRANSITIONS[currentStatus] || []
    if (!validNextStatuses.includes(newStatus)) {
      return NextResponse.json({
        error: `Transição inválida: ${currentStatus} → ${newStatus}`
      }, { status: 400 })
    }

    // Require rejection reason when rejecting
    if (newStatus === 'REJECTED' && !rejectionReason) {
      return NextResponse.json({
        error: 'Motivo da rejeição é obrigatório'
      }, { status: 400 })
    }

    // BUSINESS RULE: PRE_APPROVED → APPROVED requires:
    // 1. Approved cota statement
    // 2. Approved buyer entity (PF or PJ)
    if (currentStatus === 'PRE_APPROVED' && newStatus === 'APPROVED') {
      const cotaId = proposal.cota_id

      if (!cotaId) {
        return NextResponse.json({
          error: 'Cota não encontrada para esta proposta'
        }, { status: 400 })
      }

      // Check 1: Approved cota statement document
      const { data: cotaStatement, error: docError } = await supabase
        .from('documents')
        .select('id, status')
        .eq('owner_id', cotaId)
        .eq('owner_type', 'COTA')
        .eq('document_type', 'COTA_STATEMENT')
        .eq('status', 'APPROVED')
        .maybeSingle()

      if (docError) {
        console.error('Error checking cota statement:', docError)
        return NextResponse.json({
          error: 'Erro ao verificar extrato da cota'
        }, { status: 500 })
      }

      if (!cotaStatement) {
        return NextResponse.json({
          error: 'Para aprovar esta proposta, o extrato da cota deve estar aprovado. Por favor, solicite ao vendedor que envie o extrato da cota e aprove-o antes de continuar.'
        }, { status: 400 })
      }

      // Check 2: Approved buyer entity (PF or PJ)
      const buyerType = proposal.buyer_type
      const buyerEntityId = proposal.buyer_entity_id

      if (buyerType === 'PF') {
        // Check if PF buyer is approved
        const { data: buyerPF, error: pfError } = await supabase
          .from('profiles_pf')
          .select('status')
          .eq('id', buyerEntityId)
          .single()

        if (pfError) {
          console.error('Error checking buyer PF:', pfError)
          return NextResponse.json({
            error: 'Erro ao verificar comprador PF'
          }, { status: 500 })
        }

        if (buyerPF?.status !== 'APPROVED') {
          return NextResponse.json({
            error: 'Para aprovar esta proposta, o cadastro do comprador (Pessoa Física) deve estar aprovado. Status atual: ' + (buyerPF?.status || 'não encontrado')
          }, { status: 400 })
        }
      } else if (buyerType === 'PJ') {
        // Check if PJ buyer is approved
        const { data: buyerPJ, error: pjError } = await supabase
          .from('profiles_pj')
          .select('status')
          .eq('id', buyerEntityId)
          .single()

        if (pjError) {
          console.error('Error checking buyer PJ:', pjError)
          return NextResponse.json({
            error: 'Erro ao verificar comprador PJ'
          }, { status: 500 })
        }

        if (buyerPJ?.status !== 'APPROVED') {
          return NextResponse.json({
            error: 'Para aprovar esta proposta, o cadastro da empresa compradora (Pessoa Jurídica) deve estar aprovado. Status atual: ' + (buyerPJ?.status || 'não encontrado')
          }, { status: 400 })
        }
      }
    }

    // Update proposal status
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'REJECTED') {
      updateData.rejection_reason = rejectionReason
    } else {
      // Clear rejection reason if not rejecting (e.g., returning to UNDER_REVIEW)
      updateData.rejection_reason = null
    }

    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating proposal:', updateError)
      return NextResponse.json({
        error: 'Erro ao atualizar proposta'
      }, { status: 500 })
    }

    // Create history entry
    await supabase
      .from('proposal_history')
      .insert({
        proposal_id: id,
        old_status: currentStatus,
        new_status: newStatus,
        changed_by: user.id,
        notes: newStatus === 'REJECTED' ? rejectionReason : null,
      })

    // If approved, update cota status to RESERVED
    if (newStatus === 'APPROVED' && proposal.cota_id) {
      await supabase
        .from('cotas')
        .update({ status: 'RESERVED' })
        .eq('id', proposal.cota_id)
    }

    // If rejected and cota was reserved, set it back to available
    if (newStatus === 'REJECTED' && proposal.cota_id) {
      // Check if there are other active proposals for this cota
      const { data: otherProposals } = await supabase
        .from('proposals')
        .select('id')
        .eq('cota_id', proposal.cota_id)
        .neq('id', id)
        .not('status', 'in', '(REJECTED,COMPLETED)')

      if (!otherProposals || otherProposals.length === 0) {
        await supabase
          .from('cotas')
          .update({ status: 'AVAILABLE' })
          .eq('id', proposal.cota_id)
      }
    }

    return NextResponse.json({
      success: true,
      proposal: updatedProposal
    })

  } catch (error) {
    console.error('Error in PATCH /api/proposals/[id]:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
