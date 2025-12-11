'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ListingTable } from '@/components/ListingTable'
import { FiltersPanel } from '@/components/FiltersPanel'
import { DrawerDetails } from '@/components/DrawerDetails'
import { useListings } from '@/hooks/useListings'
import { useAuth } from '@/contexts/AuthContext'
import type { Cota } from '@/types/database'

export default function CotasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedListing, setSelectedListing] = useState<Cota | null>(null)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)

  const {
    listings,
    loading,
    administrators,
    filters,
    setFilters,
    sortField,
    sortDirection,
    handleSort,
    applyFilters,
    clearFilters,
    page,
    totalPages,
    totalCount,
    goToPage,
    pageSize,
  } = useListings()

  const handleViewDetails = (listing: Cota) => {
    setSelectedListing(listing)
    setShowDetailsDrawer(true)
  }

  const handleInterest = (listingId: string) => {
    if (!user) {
      localStorage.setItem('pendingCotaId', listingId)
      router.push(`/login?returnUrl=${encodeURIComponent('/composicao-credito?cota=' + listingId)}`)
    } else {
      router.push(`/composicao-credito?cota=${listingId}`)
    }
  }

  // Check if any filters are active
  const hasActiveFilters = filters.administrator ||
    filters.creditMin ||
    filters.creditMax ||
    filters.rateMin ||
    filters.rateMax

  return (
    <div className="min-h-screen bg-background">
      {/* Navy Stripe under header */}
      <div className="bg-gradient-hero h-32" />

      {/* Main Content Section */}
      <section className="section-light pb-16 -mt-16">
        <div className="w-full max-w-[95vw] mx-auto px-2 sm:px-4">
          <Card className="p-4 sm:p-6 md:p-8 bg-white shadow-lg rounded-xl">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Cotas Disponíveis
              </h1>
              <p className="text-muted-foreground">
                Encontre a cota de consórcio contemplada ideal para você
              </p>
            </div>

            {/* Filter Bar - Mobile: show only advanced filters button, Desktop: full filters */}
            <div className="mb-6 pb-6 border-b">
              {/* Mobile: Compact filter bar */}
              <div className="flex md:hidden items-center gap-2">
                <Sheet open={showFiltersDrawer} onOpenChange={setShowFiltersDrawer}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="flex-1 h-10 rounded-full">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filtros
                      {hasActiveFilters && (
                        <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-0.5">
                          Ativo
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[85vw] max-w-sm">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FiltersPanel
                        filters={filters}
                        onFiltersChange={setFilters}
                        onApplyFilters={() => {
                          applyFilters()
                          setShowFiltersDrawer(false)
                        }}
                        onClearFilters={clearFilters}
                        administradoras={administrators}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    className="h-10 w-10 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Desktop: Full filter bar */}
              <div className="hidden md:flex flex-wrap items-center gap-4">
                {/* Administradora Select */}
                <div className="flex-1 min-w-[150px] max-w-[200px]">
                  <label className="block text-xs text-muted-foreground mb-1">Administradora</label>
                  <select
                    value={filters.administrator || ''}
                    onChange={(e) => setFilters({ ...filters, administrator: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Todas</option>
                    {administrators.map((admin) => (
                      <option key={admin} value={admin}>
                        {admin}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Credit Range */}
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Crédito (R$)</label>
                    <Input
                      type="number"
                      placeholder="Mín"
                      value={filters.creditMin ?? ''}
                      onChange={(e) => setFilters({ ...filters, creditMin: e.target.value ? Number(e.target.value) : null })}
                      className="w-20 h-10"
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Máx"
                    value={filters.creditMax ?? ''}
                    onChange={(e) => setFilters({ ...filters, creditMax: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 h-10"
                  />
                </div>

                {/* Rate Range */}
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Taxa Mensal (% a.m.)</label>
                    <Input
                      type="number"
                      placeholder="Mín"
                      value={filters.rateMin ?? ''}
                      onChange={(e) => setFilters({ ...filters, rateMin: e.target.value ? Number(e.target.value) : null })}
                      className="w-20 h-10"
                      step="0.01"
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Máx"
                    value={filters.rateMax ?? ''}
                    onChange={(e) => setFilters({ ...filters, rateMax: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 h-10"
                    step="0.01"
                  />
                </div>

                {/* Search Button */}
                <Button
                  onClick={applyFilters}
                  className="h-10 bg-primary hover:bg-primary/90 rounded-full px-6"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>

                {/* Advanced Filters Button */}
                <Sheet open={showFiltersDrawer} onOpenChange={setShowFiltersDrawer}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-full px-4">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Mais filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filtros Avançados</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FiltersPanel
                        filters={filters}
                        onFiltersChange={setFilters}
                        onApplyFilters={() => {
                          applyFilters()
                          setShowFiltersDrawer(false)
                        }}
                        onClearFilters={clearFilters}
                        administradoras={administrators}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    className="h-10 w-10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Results Count */}
            {!loading && (
              <p className="text-muted-foreground text-sm mb-4">
                {totalCount > 0
                  ? `Mostrando ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalCount)} de ${totalCount} cotas`
                  : 'Nenhuma cota encontrada'}
              </p>
            )}

            {/* Listings Table */}
            <ListingTable
              listings={listings}
              loading={loading}
              onSort={handleSort}
              onViewDetails={handleViewDetails}
              onInterest={handleInterest}
              sortField={sortField}
              sortDirection={sortDirection}
              currentUserId={user?.id}
            />

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground order-2 sm:order-1">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Anterior</span>
                  </Button>
                  {/* Page numbers - show on mobile too but fewer */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages <= 3 ? totalPages : 3, totalPages) }, (_, i) => {
                      let pageNum: number
                      const maxVisible = totalPages <= 3 ? totalPages : 3
                      if (totalPages <= maxVisible) {
                        pageNum = i + 1
                      } else if (page <= 2) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 1) {
                        pageNum = totalPages - (maxVisible - 1) + i
                      } else {
                        pageNum = page - 1 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    {/* Show more pages on desktop */}
                    {totalPages > 3 && (
                      <div className="hidden md:flex gap-1">
                        {Array.from({ length: Math.min(2, totalPages - 3) }, (_, i) => {
                          let pageNum: number
                          if (page <= 2) {
                            pageNum = 4 + i
                          } else if (page >= totalPages - 1) {
                            return null
                          } else {
                            pageNum = page + 2 + i
                            if (pageNum > totalPages) return null
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              className="w-9"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline mr-1">Próxima</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Details Drawer */}
      <DrawerDetails
        listing={selectedListing}
        open={showDetailsDrawer}
        onOpenChange={setShowDetailsDrawer}
        onInterest={handleInterest}
        currentUserId={user?.id}
      />
    </div>
  )
}
