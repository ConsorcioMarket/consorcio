'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Menu, X, User, LogOut, FileText, Home, PlusCircle, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'

// Logo component using the actual logo image
function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/logo.png"
        alt="Consórcio Market"
        width={160}
        height={40}
        className="h-10 w-auto object-contain object-left"
        priority
      />
    </Link>
  )
}

export function Header() {
  const router = useRouter()
  const { user, profile, isAdmin, signOut } = useAuth()
  const { items, totals, setIsOpen } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <header className="bg-navy sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation - hidden for now, showing only auth buttons on right */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* Navigation links can be added here if needed */}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Cart Indicator */}
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-2 border-gray-600 text-white hover:bg-white/10"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden lg:inline">
                  {formatCurrency(totals.totalCredit)}
                </span>
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {items.length}
                </span>
              </Button>
            )}
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-white/10">
                      Admin
                    </Button>
                  </Link>
                )}
                <Link href="/meus-dados">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-white hover:bg-white/10">
                    <User className="h-4 w-4" />
                    {profile?.full_name?.split(' ')[0] || 'Meus Dados'}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white hover:bg-white/10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm" className="bg-primary text-white hover:bg-primary/90 rounded-full px-6">
                    Cadastrar
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Cart + Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="relative border-gray-600 text-white hover:bg-white/10"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {items.length}
                </span>
              </Button>
            )}
            <button
              className="p-2 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-4 w-4" />
                Início
              </Link>
              <Link
                href="/cotas"
                className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileText className="h-4 w-4" />
                Cotas Disponíveis
              </Link>
              {user ? (
                <>
                  <Link
                    href="/publicar-cota"
                    className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Anunciar Cota
                  </Link>
                  <Link
                    href="/minhas-cotas"
                    className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FileText className="h-4 w-4" />
                    Minhas Cotas
                  </Link>
                  <Link
                    href="/minhas-propostas"
                    className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FileText className="h-4 w-4" />
                    Minhas Propostas
                  </Link>
                  <Link
                    href="/meus-dados"
                    className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Meus Dados
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-primary"
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
                    className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-300 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full bg-primary text-white hover:bg-primary/90 rounded-full">
                      Cadastrar
                    </Button>
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
