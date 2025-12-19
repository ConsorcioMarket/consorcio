'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Phone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

// Logo component using actual image
function Logo() {
  return (
    <div className="flex items-center justify-center mb-6">
      <Image
        src="/logo.png"
        alt="Consórcio Market"
        width={120}
        height={30}
        className="h-8 w-auto object-contain"
        priority
      />
    </div>
  )
}

// Helper function to format phone number as (XX) XXXXX-XXXX
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export default function CadastroPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { signUp } = useAuth()
  const router = useRouter()

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.fullName.trim()) {
      return 'Por favor, informe seu nome completo.'
    }
    if (!formData.email.includes('@')) {
      return 'Por favor, informe um email válido.'
    }
    // Validate phone - must have 10 or 11 digits (with or without 9 prefix)
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return 'Por favor, informe um telefone válido com DDD.'
    }
    if (formData.password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.'
    }
    if (!acceptTerms) {
      return 'Você precisa aceitar os termos de uso.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      // Store phone as digits only in the database
      const phoneDigits = formData.phone.replace(/\D/g, '')
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        phone: phoneDigits,
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Este email já está cadastrado.')
        } else {
          setError(error.message)
        }
        return
      }

      // Registration successful - redirect to home page
      // User is already logged in, no need to go to login page
      window.location.href = '/'
    } catch {
      setError('Ocorreu um erro ao criar a conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full mx-auto bg-white shadow-xl border-0 rounded-xl">
        <CardContent className="p-8">
          <Logo />

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Acesse o ConsorcioMarket
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie sua conta gratuita para acessar recursos de análises completos das cotas.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors text-gray-500 hover:text-gray-700"
            >
              Entrar
            </button>
            <button
              type="button"
              className="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors bg-white text-gray-900 shadow-sm"
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Nome completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Telefone <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
                  required
                  disabled={loading}
                  className="h-11 pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pr-10"
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

            <div className="flex items-start space-x-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="terms" className="text-sm text-gray-600 leading-tight cursor-pointer">
                Li e concordo com o{' '}
                <Link href="/termos" className="text-primary hover:underline font-medium">
                  Termo de Consentimento de Dados Pessoais
                </Link>
                <span className="text-red-500">*</span>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium bg-primary hover:bg-primary-darker rounded-lg"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
