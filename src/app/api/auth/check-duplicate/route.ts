import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { cpf, phone } = await request.json()

    const errors: { cpf?: string; phone?: string } = {}

    // Check CPF
    if (cpf) {
      const { data: existingCpf } = await supabaseAdmin
        .from('profiles_pf')
        .select('id')
        .eq('cpf', cpf)
        .maybeSingle()

      if (existingCpf) {
        errors.cpf = 'Este CPF já está cadastrado.'
      }
    }

    // Check phone
    if (phone) {
      const { data: existingPhone } = await supabaseAdmin
        .from('profiles_pf')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()

      if (existingPhone) {
        errors.phone = 'Este telefone já está cadastrado.'
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 409 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
