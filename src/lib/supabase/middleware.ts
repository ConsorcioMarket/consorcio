import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedRoutes = ['/meus-dados', '/minhas-cotas', '/minhas-propostas', '/publicar-cota', '/composicao-credito']
  // const adminRoutes = ['/admin'] // TODO: implement admin route protection
  const authRoutes = ['/login', '/cadastro', '/recuperar-senha']

  // Routes that need special handling (password reset with code)
  const passwordResetRoutes = ['/redefinir-senha']

  // Redirect unauthenticated users from protected routes
  if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from auth routes (but NOT from password reset)
  if (user && authRoutes.some(route => pathname.startsWith(route)) && !passwordResetRoutes.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check if user has admin role by fetching profile
    const { data: profile } = await supabase
      .from('profiles_pf')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
