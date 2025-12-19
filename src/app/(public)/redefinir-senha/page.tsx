'use client'

import { useState, useEffect, useMemo } from 'react'
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

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkSession = async () => {
      // Check if we have a hash fragment (Supabase recovery links use hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      console.log('Hash params:', { hasAccessToken: !!accessToken, type })

      // If we have recovery tokens in the hash, Supabase will process them automatically
      // We need to wait for onAuthStateChange to fire

      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth event:', event, 'Has session:', !!session)
          if (isMounted) {
            if (event === 'PASSWORD_RECOVERY' ||
                (event === 'SIGNED_IN' && session) ||
                (event === 'TOKEN_REFRESHED' && session) ||
                (event === 'INITIAL_SESSION' && session)) {
              console.log('Session detected via event:', event)
              setIsValidSession(true)
              setChecking(false)
              // Clear the hash from URL for cleaner look
              if (window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname)
              }
            }
          }
        }
      )

      // If there's an access token in the hash, Supabase should process it
      // Give it time to do so
      if (accessToken && type === 'recovery') {
        console.log('Recovery token found in hash, waiting for Supabase to process...')
        // Supabase client will automatically pick up the tokens from the hash
        // Wait longer for this to happen
        timeoutId = setTimeout(() => {
          if (isMounted && !isValidSession) {
            console.log('Timeout reached after hash processing attempt')
            setChecking(false)
          }
        }, 5000)
        return () => subscription.unsubscribe()
      }

      // No hash tokens - check for existing session (redirect from callback)
      // Small delay to let onAuthStateChange fire first
      await new Promise(resolve => setTimeout(resolve, 200))

      // Check for existing session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log("getSession result:", { session: !!session, error: sessionError?.message })

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
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.log('Timeout reached, no session found')
          setChecking(false)
        }
      }, 3000)

      return () => {
        subscription.unsubscribe()
      }
    }

    checkSession()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [supabase, isValidSession])

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

    try {
      // First verify we have a valid session with timeout
      const getUserPromise = supabase.auth.getUser()
      const getUserTimeout = new Promise<{ data: { user: null }; error: Error }>((resolve) => {
        setTimeout(() => resolve({ data: { user: null }, error: new Error('Timeout') }), 5000)
      })

      const { data: { user: currentUser } } = await Promise.race([getUserPromise, getUserTimeout])

      if (!currentUser) {
        setError('Sessão expirada. Por favor, solicite um novo link de recuperação.')
        setLoading(false)
        return
      }

      // Update the password with timeout
      const updatePromise = supabase.auth.updateUser({
        password: password,
      })
      const updateTimeout = new Promise<{ data: { user: null }; error: Error }>((resolve) => {
        setTimeout(() => resolve({ data: { user: null }, error: new Error('Timeout - a senha pode ter sido atualizada. Tente fazer login.') }), 10000)
      })

      const { data, error } = await Promise.race([updatePromise, updateTimeout])

      if (error) {
        console.error('Password update error:', error)
        if (error.message.includes('same_password')) {
          setError('A nova senha deve ser diferente da senha atual.')
        } else if (error.message.includes('Timeout')) {
          // Timeout - password might have been updated
          setLoading(false)
          setSuccess(true)
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
          return
        } else {
          setError(error.message || 'Erro ao atualizar senha. Tente novamente.')
        }
        setLoading(false)
        return
      }

      if (!data?.user) {
        setError('Erro ao atualizar senha. Tente novamente.')
        setLoading(false)
        return
      }

      // Password updated successfully
      setLoading(false)
      setSuccess(true)

      // Sign out and redirect to login
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})

      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    } catch (err) {
      console.error('Password update exception:', err)
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
