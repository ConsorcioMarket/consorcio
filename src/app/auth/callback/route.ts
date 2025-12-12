import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  console.log('Auth callback received:', { code: code ? 'present' : 'missing', type, origin })
  console.log('Full URL:', request.url)

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            console.log('Setting cookies:', cookiesToSet.map(c => c.name))
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('Exchange result:', { hasSession: !!data?.session, error: error?.message })

    if (!error && data?.session) {
      // If this is a password recovery, redirect to the reset password page
      if (type === 'recovery') {
        console.log('Redirecting to /redefinir-senha')
        return NextResponse.redirect(`${origin}/redefinir-senha`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('Error exchanging code for session:', error)
  }

  // Return the user to an error page with instructions
  console.log('No code or exchange failed, redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
