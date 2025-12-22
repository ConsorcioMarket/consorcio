'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('Ocorreu um erro ao enviar o email. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Recuperar senha
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Enviaremos um link para redefinir sua senha
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
                    Email enviado!
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  </p>
                  <p className="text-sm text-gray-500 mb-8">
                    Não recebeu o email? Tente novamente.
                  </p>
                  <div className="space-y-3">
                    <Button
                      onClick={() => setSuccess(false)}
                      variant="outline"
                      className="w-full h-12"
                    >
                      Enviar novamente
                    </Button>
                    <Link href="/login" className="block">
                      <Button variant="ghost" className="w-full h-12">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para login
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-primary-darker mb-2">
                      Esqueceu sua senha?
                    </h2>
                    <p className="text-muted-foreground">
                      Digite seu email e enviaremos um link para recuperação
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-11 h-12 text-base"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold"
                      disabled={loading}
                    >
                      {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                    </Button>

                    <Link href="/login" className="block">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-12 text-base"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para login
                      </Button>
                    </Link>
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
