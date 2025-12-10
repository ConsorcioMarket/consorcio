import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
      return NextResponse.json({ error: 'Apenas administradores podem aprovar/rejeitar documentos' }, { status: 403 })
    }

    const body = await request.json()
    const { status: newStatus, rejectionReason, handleProposals } = body

    if (!newStatus || !['APPROVED', 'REJECTED'].includes(newStatus)) {
      return NextResponse.json({ error: 'Status inválido. Use APPROVED ou REJECTED' }, { status: 400 })
    }

    // Get current document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    // Require rejection reason when rejecting
    if (newStatus === 'REJECTED' && !rejectionReason) {
      return NextResponse.json({
        error: 'Motivo da rejeição é obrigatório'
      }, { status: 400 })
    }

    // Update document status
    const updateData: Record<string, unknown> = {
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'REJECTED') {
      updateData.rejection_reason = rejectionReason
    } else {
      // Clear rejection reason if approving
      updateData.rejection_reason = null
    }

    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating document:', updateError)
      return NextResponse.json({
        error: 'Erro ao atualizar documento'
      }, { status: 500 })
    }

    // BUSINESS RULE: When a COTA_STATEMENT is rejected, handle related proposals
    if (newStatus === 'REJECTED' && document.document_type === 'COTA_STATEMENT' && document.owner_type === 'COTA') {
      const cotaId = document.owner_id

      // Find proposals for this cota that are in PRE_APPROVED status
      const { data: affectedProposals } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('cota_id', cotaId)
        .eq('status', 'PRE_APPROVED')

      if (affectedProposals && affectedProposals.length > 0) {
        // handleProposals can be 'reject' or 'return_to_review'
        const proposalAction = handleProposals || 'return_to_review'

        for (const proposal of affectedProposals) {
          if (proposalAction === 'reject') {
            // Reject the proposal
            await supabase
              .from('proposals')
              .update({
                status: 'REJECTED',
                rejection_reason: `Extrato da cota rejeitado: ${rejectionReason}`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', proposal.id)

            // Create history entry
            await supabase
              .from('proposal_history')
              .insert({
                proposal_id: proposal.id,
                old_status: proposal.status,
                new_status: 'REJECTED',
                changed_by: user.id,
                notes: `Proposta rejeitada automaticamente - Extrato da cota rejeitado: ${rejectionReason}`,
              })
          } else {
            // Return to UNDER_REVIEW
            await supabase
              .from('proposals')
              .update({
                status: 'UNDER_REVIEW',
                updated_at: new Date().toISOString(),
              })
              .eq('id', proposal.id)

            // Create history entry
            await supabase
              .from('proposal_history')
              .insert({
                proposal_id: proposal.id,
                old_status: proposal.status,
                new_status: 'UNDER_REVIEW',
                changed_by: user.id,
                notes: `Proposta retornada para análise - Extrato da cota rejeitado: ${rejectionReason}`,
              })
          }
        }

        return NextResponse.json({
          success: true,
          document: updatedDocument,
          affectedProposals: affectedProposals.length,
          proposalAction: proposalAction === 'reject' ? 'rejected' : 'returned_to_review'
        })
      }
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument
    })

  } catch (error) {
    console.error('Error in PATCH /api/documents/[id]:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
