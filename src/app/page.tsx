'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ListingTable } from '@/components/ListingTable'
import { FiltersPanel } from '@/components/FiltersPanel'
import { DrawerDetails } from '@/components/DrawerDetails'
import { HowItWorksSection } from '@/components/HowItWorksSection'
import { useListings } from '@/hooks/useListings'
import { useAuth } from '@/contexts/AuthContext'
import type { Cota } from '@/types/database'

export default function Home() {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Compre e Venda Cotas de Consórcio Contempladas
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Marketplace seguro para negociação de cotas contempladas de imóveis e veículos
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="text-lg bg-white text-primary-darker hover:bg-white/90"
                onClick={() => router.push('/publicar-cota')}
              >
                Anunciar minha cota
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg border-white text-white hover:bg-white/10"
                onClick={() => router.push('/cadastro')}
              >
                Encontrar cota ideal
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="section-light py-16">
        <div className="container mx-auto px-4">
          <Card className="p-8 bg-white shadow-md">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-primary-darker mb-3">
                Cotas Disponíveis
              </h2>
              <p className="text-lg text-muted-foreground">
                Encontre a cota de consórcio contemplada ideal para você
              </p>
            </div>

            <div className="flex gap-6">
              {/* Desktop Filters Sidebar */}
              <div className="hidden lg:block w-80 shrink-0">
                <div className="sticky top-24">
                  <FiltersPanel
                    filters={filters}
                    onFiltersChange={setFilters}
                    onApplyFilters={applyFilters}
                    onClearFilters={clearFilters}
                    administradoras={administrators}
                  />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 space-y-6">
                {/* Mobile Filters Button */}
                <div className="lg:hidden">
                  <Sheet open={showFiltersDrawer} onOpenChange={setShowFiltersDrawer}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
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
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Results Count */}
                {!loading && (
                  <p className="text-muted-foreground text-sm">
                    {listings.length} {listings.length === 1 ? 'cota encontrada' : 'cotas encontradas'}
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
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Final CTA Section */}
      <section className="bg-primary-darker text-white py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Tem uma cota contemplada?
          </h2>
          <p className="text-xl md:text-2xl mb-10 text-white/90">
            Anuncie gratuitamente e venda com segurança
          </p>
          <Button
            size="lg"
            className="text-lg bg-white text-primary-darker hover:bg-white/90"
            onClick={() => router.push('/publicar-cota')}
          >
            Anunciar minha cota
          </Button>
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
