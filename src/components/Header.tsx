'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, User, LogOut, FileText, Home, PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export function Header() {
  const router = useRouter()
  const { user, profile, isAdmin, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-[hsl(var(--primary-darker))]">
              Consórcio Market
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))] transition-colors"
            >
              Início
            </Link>
            <Link
              href="/cotas"
              className="text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))] transition-colors"
            >
              Cotas Disponíveis
            </Link>
            {user && (
              <>
                <Link
                  href="/publicar-cota"
                  className="text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))] transition-colors"
                >
                  Anunciar Cota
                </Link>
                <Link
                  href="/minhas-cotas"
                  className="text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))] transition-colors"
                >
                  Minhas Cotas
                </Link>
                <Link
                  href="/minhas-propostas"
                  className="text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))] transition-colors"
                >
                  Minhas Propostas
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      Admin
                    </Button>
                  </Link>
                )}
                <Link href="/meus-dados">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {profile?.full_name?.split(' ')[0] || 'Meus Dados'}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm">Cadastrar</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-4 w-4" />
                Início
              </Link>
              <Link
                href="/cotas"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileText className="h-4 w-4" />
                Cotas Disponíveis
              </Link>
              {user ? (
                <>
                  <Link
                    href="/publicar-cota"
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Anunciar Cota
                  </Link>
                  <Link
                    href="/minhas-cotas"
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FileText className="h-4 w-4" />
                    Minhas Cotas
                  </Link>
                  <Link
                    href="/minhas-propostas"
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FileText className="h-4 w-4" />
                    Minhas Propostas
                  </Link>
                  <Link
                    href="/meus-dados"
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Meus Dados
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleSignOut()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-600 hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full">Cadastrar</Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
