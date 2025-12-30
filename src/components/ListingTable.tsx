'use client'

import { ArrowUpDown, Eye, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatPercentage, getCotaStatusLabel } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/ui/toast'
import type { Cota } from '@/types/database'
import type { SortField, SortDirection } from '@/hooks/useListings'

interface SortableHeaderProps {
  field: SortField
  children: React.ReactNode
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}

function SortableHeader({
  field,
  children,
  sortField,
  sortDirection,
  onSort,
}: SortableHeaderProps) {
  const isActive = sortField === field
  return (
    <TableHead
      className="cursor-pointer text-center select-none"
      style={{
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : undefined,
      }}
      onClick={() => onSort(field)}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = ''
        }
      }}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        <ArrowUpDown
          className={`h-4 w-4 transition-all duration-200 ${
            isActive ? 'text-white scale-110' : 'text-white/60'
          }`}
        />
        {isActive && (
          <span className="text-xs text-white/80">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  )
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return 'success'
    case 'RESERVED':
      return 'warning'
    case 'SOLD':
      return 'secondary'
    default:
      return 'outline'
  }
}

interface ListingTableProps {
  listings: Cota[]
  loading: boolean
  onSort: (field: SortField) => void
  onViewDetails: (listing: Cota) => void
  onInterest: (listingId: string) => void
  sortField: SortField
  sortDirection: SortDirection
  currentUserId?: string
}

export function ListingTable({
  listings,
  loading,
  onSort,
  onViewDetails,
  onInterest,
  sortField,
  sortDirection,
  currentUserId,
}: ListingTableProps) {
  const { addItem, isInCart, canAddToCart } = useCart()
  const { addToast } = useToast()

  const handleAddToCart = (listing: Cota, e: React.MouseEvent) => {
    e.stopPropagation()
    const result = addItem(listing)
    if (result.success) {
      addToast({
        title: 'Cota adicionada',
        description: 'A cota foi adicionada à sua composição.',
        variant: 'success',
      })
    } else {
      addToast({
        title: 'Não foi possível adicionar',
        description: result.error || 'Erro ao adicionar cota.',
        variant: 'warning',
      })
    }
  }

  const renderSortableHeader = (field: SortField, children: React.ReactNode) => (
    <SortableHeader
      field={field}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
    >
      {children}
    </SortableHeader>
  )

  if (loading) {
    return (
      <>
        {/* Mobile Loading */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          ))}
        </div>
        {/* Desktop Loading */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Administradora</TableHead>
                <TableHead className="text-center">Crédito</TableHead>
                <TableHead className="text-center">Saldo Devedor</TableHead>
                <TableHead className="text-center">Parcelas</TableHead>
                <TableHead className="text-center">Entrada</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center"><Skeleton className="h-4 w-32 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-20 rounded-full mx-auto" /></TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma cota encontrada.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Tente ajustar os filtros para ver mais resultados.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {listings.map((listing) => {
          const isMine = currentUserId === listing.seller_id
          const isReserved = listing.status === 'RESERVED'
          const inCart = isInCart(listing.id)
          const { canAdd } = canAddToCart(listing)

          return (
            <div
              key={listing.id}
              className={`bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                isMine ? 'bg-muted/30 border-muted' : ''
              } ${inCart ? 'bg-primary/5 border-primary/30' : ''}`}
              onClick={() => onViewDetails(listing)}
            >
              {/* Header: Administrator + Status */}
              <div className="flex justify-between items-start gap-2 mb-3">
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">
                  {listing.administrator}
                </h3>
                <Badge variant={getStatusBadgeVariant(listing.status)} className="shrink-0 text-xs">
                  {getCotaStatusLabel(listing.status)}
                </Badge>
              </div>

              {/* Main Values */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Credito</p>
                  <p className="font-bold text-primary text-sm">{formatCurrency(listing.credit_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="font-bold text-sm">{formatCurrency(listing.entry_amount)}</p>
                </div>
              </div>

              {/* Secondary Values - Row 1 */}
              <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Saldo Devedor</p>
                  <p className="font-medium">{formatCurrency(listing.outstanding_balance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Parcela</p>
                  <p className="font-medium">{formatCurrency(listing.installment_value)}</p>
                </div>
              </div>

              {/* Secondary Values - Row 2 */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Parcelas</p>
                  <p className="font-medium">{listing.n_installments}x</p>
                </div>
                <div>
                  <p className="text-muted-foreground">% Entrada</p>
                  <p className="font-medium">{formatPercentage(listing.entry_percentage)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Taxa</p>
                  <p className="font-medium">
                    {listing.monthly_rate !== null && listing.monthly_rate !== undefined
                      ? formatPercentage(listing.monthly_rate, 2)
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                {!isMine && !isReserved ? (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 h-9 bg-primary hover:bg-primary/90 text-white text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onInterest(listing.id)
                      }}
                    >
                      Tenho Interesse
                    </Button>
                    {inCart ? (
                      <Badge variant="success" className="text-xs flex items-center gap-1 h-9 px-3">
                        <Check className="h-3 w-3" />
                      </Badge>
                    ) : canAdd ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 text-xs"
                        onClick={(e) => handleAddToCart(listing, e)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </>
                ) : isMine ? (
                  <Badge variant="outline" className="text-xs flex-1 justify-center py-2">
                    Minha cota
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs flex-1 justify-center py-2">
                    Reservada
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewDetails(listing)
                  }}
                  aria-label="Ver detalhes"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {renderSortableHeader('administrator', 'Administradora')}
              {renderSortableHeader('credit_amount', 'Crédito')}
              {renderSortableHeader('outstanding_balance', 'Saldo Devedor')}
              {renderSortableHeader('n_installments', 'Parcelas')}
              {renderSortableHeader('installment_value', 'Valor Parcela')}
              {renderSortableHeader('entry_amount', 'Entrada')}
              {renderSortableHeader('entry_percentage', '% Entrada')}
              {renderSortableHeader('monthly_rate', 'Taxa Mensal')}
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing) => {
              const isMine = currentUserId === listing.seller_id
              const isReserved = listing.status === 'RESERVED'
              const inCart = isInCart(listing.id)
              const { canAdd } = canAddToCart(listing)

              return (
                <TableRow
                  key={listing.id}
                  className={`${isMine ? 'bg-muted/30' : ''} ${inCart ? 'bg-primary/5' : ''} cursor-pointer hover:bg-muted/50 transition-all duration-200 hover:shadow-sm`}
                  onClick={() => onViewDetails(listing)}
                >
                  <TableCell className="font-medium text-center">{listing.administrator}</TableCell>
                  <TableCell className="text-center">{formatCurrency(listing.credit_amount)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(listing.outstanding_balance)}</TableCell>
                  <TableCell className="text-center">{listing.n_installments}x</TableCell>
                  <TableCell className="text-center">{formatCurrency(listing.installment_value)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(listing.entry_amount)}</TableCell>
                  <TableCell className="text-center">{formatPercentage(listing.entry_percentage)}</TableCell>
                  <TableCell className="text-center">
                    {listing.monthly_rate !== null && listing.monthly_rate !== undefined
                      ? formatPercentage(listing.monthly_rate, 4)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusBadgeVariant(listing.status)}>
                      {getCotaStatusLabel(listing.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 transition-all duration-200 hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewDetails(listing)
                        }}
                        aria-label="Ver detalhes"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                      {!isMine && !isReserved && (
                        <>
                          {inCart ? (
                            <Badge variant="success" className="text-xs flex items-center gap-1 animate-bounce-in">
                              <Check className="h-3 w-3" />
                              Na composição
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant={canAdd ? 'outline' : 'ghost'}
                              className="h-10 px-3 transition-all duration-200 hover:scale-105 press-effect"
                              onClick={(e) => handleAddToCart(listing, e)}
                              disabled={!canAdd}
                              title={canAdd ? 'Adicionar à composição' : 'Não é possível adicionar'}
                            >
                              <Plus className="h-5 w-5 sm:mr-1" />
                              <span className="hidden sm:inline">Compor</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="h-10 px-3 bg-secondary hover:bg-secondary/90 text-white transition-all duration-200 hover:scale-105 press-effect"
                            onClick={(e) => {
                              e.stopPropagation()
                              onInterest(listing.id)
                            }}
                          >
                            <span className="hidden sm:inline">Interesse</span>
                            <span className="sm:hidden">+</span>
                          </Button>
                        </>
                      )}
                      {isMine && (
                        <Badge variant="outline" className="text-xs">
                          Minha cota
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
