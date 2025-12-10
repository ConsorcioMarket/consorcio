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
  return (
    <TableHead
      className="cursor-pointer hover:bg-primary/20 transition-all duration-200 text-center"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        <ArrowUpDown
          className={`h-4 w-4 transition-all duration-200 ${
            sortField === field ? 'text-primary scale-110' : 'text-muted-foreground'
          }`}
        />
        {sortField === field && (
          <span className="text-xs text-muted-foreground animate-fade-in-scale">
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
      <div className="overflow-x-auto">
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
    <div className="overflow-x-auto">
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
                  {listing.monthly_rate
                    ? formatPercentage(listing.monthly_rate, 4)
                    : '-'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusBadgeVariant(listing.status)}>
                    {getCotaStatusLabel(listing.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="transition-all duration-200 hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewDetails(listing)
                      }}
                    >
                      <Eye className="h-4 w-4" />
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
                            className="transition-all duration-200 hover:scale-105 press-effect"
                            onClick={(e) => handleAddToCart(listing, e)}
                            disabled={!canAdd}
                            title={canAdd ? 'Adicionar à composição' : 'Não é possível adicionar'}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Compor
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="bg-secondary hover:bg-secondary/90 text-white transition-all duration-200 hover:scale-105 press-effect"
                          onClick={(e) => {
                            e.stopPropagation()
                            onInterest(listing.id)
                          }}
                        >
                          Interesse
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
  )
}
