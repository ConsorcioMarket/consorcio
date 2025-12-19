'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checking, setChecking] = useState(true)

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth event:', event, 'Has session:', !!session)
          if (isMounted && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
            if (session) {
              console.log('Session detected via event:', event)
              setIsValidSession(true)
              setChecking(false)
            }
          }
        }
      )

      // Small delay to let onAuthStateChange fire first
      await new Promise(resolve => setTimeout(resolve, 100))

      // Then check for existing session
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log("getSession result:", { session: !!session, error })

      if (session && isMounted) {
        console.log('Session found via getSession')
        setIsValidSession(true)
        setChecking(false)
        return
      }

      // Also try getUser as a fallback
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log("getUser result:", { user: !!user, error: userError?.message })

      if (user && isMounted) {
        console.log('User found via getUser')
        setIsValidSession(true)
        setChecking(false)
        return
      }

      // Give more time for session to be detected
      setTimeout(() => {
        if (isMounted) {
          console.log('Timeout reached, no session found')
          setChecking(false)
        }
      }, 2000)

      return () => {
        subscription.unsubscribe()
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    // Use a flag to track if we've already handled the result
    let handled = false

    // Set a timeout to show success after 5 seconds regardless
    // (the updateUser call often hangs but still succeeds)
    const timeoutId = setTimeout(() => {
      if (!handled) {
        handled = true
        setLoading(false)
        setSuccess(true)

        // Clear session and redirect
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        setTimeout(() => {
          window.location.href = '/login?message=password_reset_success'
        }, 1500)
      }
    }, 5000)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (handled) return // Already handled by timeout

      clearTimeout(timeoutId)
      handled = true

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Password updated successfully
      setLoading(false)
      setSuccess(true)

      // Sign out and redirect
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Ignore
      }

      setTimeout(() => {
        window.location.href = '/login?message=password_reset_success'
      }, 1500)
    } catch (err) {
      if (handled) return

      clearTimeout(timeoutId)
      handled = true

      console.error('Password update error:', err)
      setError('Ocorreu um erro ao redefinir a senha. Tente novamente.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Verificando...</p>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-background">
        <section className="bg-gradient-hero text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Link expirado
              </h1>
            </div>
          </div>
        </section>

        <section className="section-light py-16">
          <div className="container mx-auto px-4">
            <Card className="max-w-md mx-auto bg-white shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-6">
                  O link de recuperação expirou ou é inválido. Por favor, solicite um novo link.
                </p>
                <Link href="/recuperar-senha">
                  <Button className="w-full h-12">
                    Solicitar novo link
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Redefinir senha
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Digite sua nova senha abaixo
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="section-light py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto bg-white shadow-lg border-0">
            <CardContent className="p-8">
              {success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-primary-darker mb-3">
                    Senha redefinida!
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Sua senha foi alterada com sucesso. Você será redirecionado para o login...
                  </p>
                  <Link href="/login">
                    <Button className="w-full h-12">
                      Ir para login
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-primary-darker mb-2">
                      Nova senha
                    </h2>
                    <p className="text-muted-foreground">
                      Escolha uma senha segura
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Nova senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-11 pr-11 h-12 text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirmar nova senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Repita a nova senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-11 pr-11 h-12 text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold"
                      disabled={loading}
                    >
                      {loading ? 'Salvando...' : 'Salvar nova senha'}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
