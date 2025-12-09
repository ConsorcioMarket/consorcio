'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Menu, X, User, LogOut, FileText, Home, PlusCircle, ShoppingCart, ChevronDown, Settings, Clock } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

// Logo component using the actual logo image
function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/logo.png"
        alt="Consórcio Market"
        width={120}
        height={32}
        className="object-contain object-left max-h-10"
        priority
      />
    </Link>
  )
}

interface UserStats {
  cotasCount: number
  proposalsCount: number
  pendingProposals: number
}

export function Header() {
  const router = useRouter()
  const { user, profile, isAdmin, signOut } = useAuth()
  const { items, totals, setIsOpen, clearCart } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({ cotasCount: 0, proposalsCount: 0, pendingProposals: 0 })
  const userMenuRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  // Fetch user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return

      try {
        // Fetch cotas count
        const { count: cotasCount } = await supabase
          .from('cotas')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', user.id)

        // Fetch proposals count
        const { data: proposalsData } = await supabase
          .from('proposals')
          .select('status')
          .eq('buyer_pf_id', user.id)

        const proposalsCount = proposalsData?.length || 0
        const pendingProposals = proposalsData?.filter(p =>
          p.status === 'UNDER_REVIEW' || p.status === 'PRE_APPROVED'
        ).length || 0

        setUserStats({
          cotasCount: cotasCount || 0,
          proposalsCount,
          pendingProposals,
        })
      } catch (error) {
        console.error('Error fetching user stats:', error)
      }
    }

    fetchUserStats()
  }, [user, supabase])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    clearCart()
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
                className="relative flex items-center gap-2 bg-white text-navy border-white hover:bg-gray-100"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden lg:inline font-semibold">
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
                    <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-navy">
                      Admin
                    </Button>
                  </Link>
                )}

                {/* User Dropdown Menu */}
                <div className="relative" ref={userMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-white hover:bg-white hover:text-navy"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <User className="h-4 w-4" />
                    <span>{profile?.full_name?.split(' ')[0] || 'Menu'}</span>
                    {userStats.pendingProposals > 0 && (
                      <span className="bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {userStats.pendingProposals}
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border py-2 z-50">
                      {/* User Info */}
                      <div className="px-4 py-2 border-b">
                        <p className="font-medium text-gray-900">{profile?.full_name || 'Usuário'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>

                      {/* Stats */}
                      <div className="px-4 py-3 border-b grid grid-cols-2 gap-2">
                        <Link
                          href="/minhas-cotas"
                          className="flex flex-col items-center p-2 rounded hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg font-bold text-primary">{userStats.cotasCount}</span>
                          <span className="text-xs text-gray-500">Minhas Cotas</span>
                        </Link>
                        <Link
                          href="/minhas-propostas"
                          className="flex flex-col items-center p-2 rounded hover:bg-gray-50 relative"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg font-bold text-primary">{userStats.proposalsCount}</span>
                          <span className="text-xs text-gray-500">Propostas</span>
                          {userStats.pendingProposals > 0 && (
                            <span className="absolute top-1 right-1 flex items-center gap-1 text-xs text-yellow-600">
                              <Clock className="h-3 w-3" />
                              {userStats.pendingProposals}
                            </span>
                          )}
                        </Link>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/minhas-cotas"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <FileText className="h-4 w-4 text-gray-400" />
                          Minhas Cotas
                        </Link>
                        <Link
                          href="/minhas-propostas"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <FileText className="h-4 w-4 text-gray-400" />
                          Minhas Propostas
                          {userStats.pendingProposals > 0 && (
                            <span className="ml-auto bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                              {userStats.pendingProposals} pendente{userStats.pendingProposals > 1 ? 's' : ''}
                            </span>
                          )}
                        </Link>
                        <Link
                          href="/publicar-cota"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <PlusCircle className="h-4 w-4 text-gray-400" />
                          Anunciar Cota
                        </Link>
                        <Link
                          href="/meus-dados"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 text-gray-400" />
                          Meus Dados
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t py-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false)
                            handleSignOut()
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:text-navy">
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
                    className="flex items-center justify-between text-sm font-medium text-gray-300 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Minhas Cotas
                    </span>
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {userStats.cotasCount}
                    </span>
                  </Link>
                  <Link
                    href="/minhas-propostas"
                    className="flex items-center justify-between text-sm font-medium text-gray-300 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Minhas Propostas
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                        {userStats.proposalsCount}
                      </span>
                      {userStats.pendingProposals > 0 && (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {userStats.pendingProposals} pend.
                        </span>
                      )}
                    </span>
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
