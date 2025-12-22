'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, User, LogOut, FileText, Home, PlusCircle, ShoppingCart, ChevronDown, Clock, CreditCard, Users, LayoutDashboard, Shield, ClipboardList, Settings } from 'lucide-react'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, cn } from '@/lib/utils'

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
  const pathname = usePathname()
  const { user, profile, isAdmin, signOut, loading: authLoading } = useAuth()
  const { items, totals, setIsOpen, clearCart } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({ cotasCount: 0, proposalsCount: 0, pendingProposals: 0 })
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Fix hydration mismatch by only rendering auth-dependent content after mount
  // Using useSyncExternalStore to avoid ESLint warning about setState in effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

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

  // Admin navigation links
  const adminNavLinks = [
    { href: '/admin', label: 'Painel', icon: LayoutDashboard },
    { href: '/admin/cotas', label: 'Cotas', icon: CreditCard },
    { href: '/admin/propostas', label: 'Propostas', icon: ClipboardList },
    { href: '/admin/documentos', label: 'Documentos', icon: FileText },
    { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  ]

  // User navigation links (for logged-in non-admin users)
  const userNavLinks = [
    { href: '/cotas', label: 'Cotas', icon: CreditCard },
    { href: '/minhas-cotas', label: 'Minhas Cotas', icon: FileText },
    { href: '/minhas-propostas', label: 'Minhas Propostas', icon: ClipboardList },
    { href: '/meus-dados', label: 'Meus Dados', icon: Settings },
  ]

  // Helper to check if a path is active
  const isActivePath = (href: string) => {
    if (href === '/cotas') {
      return pathname === '/cotas' || pathname?.startsWith('/cota/')
    }
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <header className="bg-navy sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation - Show nav links for logged-in users */}
          <nav className="hidden md:flex items-center space-x-1">
            {mounted && !authLoading && user && !isAdmin && (
              <>
                {userNavLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = isActivePath(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "text-white bg-white/15"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  )
                })}
              </>
            )}
            {mounted && !authLoading && isAdmin && (
              <>
                {adminNavLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = isActivePath(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "text-white bg-white/15"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  )
                })}
                <div className="w-px h-6 bg-gray-600 mx-2" />
              </>
            )}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Cart Indicator - only render after mount to prevent hydration mismatch */}
            {mounted && items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-2 bg-white text-navy border-white hover:bg-gray-100 transition-all duration-200 hover:scale-105 animate-fade-in-scale"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden lg:inline font-semibold tabular-nums">
                  {formatCurrency(totals.totalCredit)}
                </span>
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center badge-pulse">
                  {items.length}
                </span>
              </Button>
            )}
            {mounted && !authLoading && user ? (
              <div className="flex items-center space-x-4">
                {/* Admin Badge */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold">
                    <Shield className="h-3 w-3" />
                    ADMIN
                  </div>
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
                    <span>{profile?.full_name?.split(' ')[0] || 'Conta'}</span>
                    {userStats.pendingProposals > 0 && (
                      <span className="bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {userStats.pendingProposals}
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border py-2 z-50 animate-fade-in-scale origin-top-right">
                      {/* User Info */}
                      <div className="px-4 py-2 border-b">
                        <p className="font-medium text-gray-900">{profile?.full_name || 'Usuário'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>

                      {/* Stats */}
                      <div className="px-4 py-3 border-b grid grid-cols-2 gap-2">
                        <Link
                          href="/minhas-cotas"
                          className="flex flex-col items-center p-2 rounded hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg font-bold text-primary tabular-nums">{userStats.cotasCount}</span>
                          <span className="text-xs text-gray-500">Minhas Cotas</span>
                        </Link>
                        <Link
                          href="/minhas-propostas"
                          className="flex flex-col items-center p-2 rounded hover:bg-gray-50 relative transition-all duration-200 hover:scale-105"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg font-bold text-primary tabular-nums">{userStats.proposalsCount}</span>
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
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <FileText className="h-4 w-4 text-gray-400" />
                          Minhas Cotas
                        </Link>
                        <Link
                          href="/minhas-propostas"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
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
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <PlusCircle className="h-4 w-4 text-gray-400" />
                          Anunciar Cota
                        </Link>
                        <Link
                          href="/meus-dados"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
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
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors duration-150"
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : mounted && !authLoading ? (
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
            ) : null}
          </div>

          {/* Mobile Cart + Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {mounted && items.length > 0 && (
              <button
                onClick={() => setIsOpen(true)}
                className="relative p-3 text-white rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Ver carrinho de compras"
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {items.length}
                </span>
              </button>
            )}
            <button
              className="p-3 text-white rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
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
          <div className="md:hidden py-4 border-t border-gray-700 animate-fade-in-down max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="flex flex-col space-y-1 animate-stagger pb-4">
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-3 py-3 px-2 rounded-lg text-base font-medium transition-colors",
                  pathname === '/' ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5" />
                Início
              </Link>
              <Link
                href="/cotas"
                className={cn(
                  "flex items-center gap-3 py-3 px-2 rounded-lg text-base font-medium transition-colors",
                  isActivePath('/cotas') ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileText className="h-5 w-5" />
                Cotas Disponíveis
              </Link>
              {mounted && !authLoading && user ? (
                <>
                  <Link
                    href="/publicar-cota"
                    className={cn(
                      "flex items-center gap-3 py-3 px-2 rounded-lg text-base font-medium transition-colors",
                      isActivePath('/publicar-cota') ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PlusCircle className="h-5 w-5" />
                    Anunciar Cota
                  </Link>
                  <Link
                    href="/minhas-cotas"
                    className={cn(
                      "flex items-center justify-between py-3 px-2 rounded-lg text-base font-medium transition-colors",
                      isActivePath('/minhas-cotas') ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
                      Minhas Cotas
                    </span>
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {userStats.cotasCount}
                    </span>
                  </Link>
                  <Link
                    href="/minhas-propostas"
                    className={cn(
                      "flex items-center justify-between py-3 px-2 rounded-lg text-base font-medium transition-colors",
                      isActivePath('/minhas-propostas') ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
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
                    className={cn(
                      "flex items-center gap-3 py-3 px-2 rounded-lg text-base font-medium transition-colors",
                      isActivePath('/meus-dados') ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    Meus Dados
                  </Link>
                  {isAdmin && (
                    <>
                      <div className="border-t border-gray-700 my-2 pt-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold w-fit mb-2">
                          <Shield className="h-3 w-3" />
                          ADMIN
                        </div>
                      </div>
                      {adminNavLinks.map((link) => {
                        const Icon = link.icon
                        const isActive = isActivePath(link.href)
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "flex items-center gap-3 py-3 px-2 rounded-lg text-base font-medium transition-colors",
                              isActive ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Icon className="h-5 w-5" />
                            {link.label}
                          </Link>
                        )
                      })}
                    </>
                  )}
                  <button
                    onClick={() => {
                      handleSignOut()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-3 py-3 px-2 rounded-lg text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </button>
                </>
              ) : (
                <div className="space-y-3 pt-2">
                  <Link
                    href="/login"
                    className="flex items-center justify-center py-3 px-4 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full h-12 bg-primary text-white hover:bg-primary/90 rounded-full text-base">
                      Cadastrar
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
