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

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField
    children: React.ReactNode
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={`h-4 w-4 ${
            sortField === field ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
        {sortField === field && (
          <span className="text-xs text-muted-foreground">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  )

  const getStatusBadgeVariant = (status: string) => {
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

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Administradora</TableHead>
              <TableHead>Crédito</TableHead>
              <TableHead>Saldo Devedor</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
            <SortableHeader field="administrator">Administradora</SortableHeader>
            <SortableHeader field="credit_amount">Crédito</SortableHeader>
            <SortableHeader field="outstanding_balance">Saldo Devedor</SortableHeader>
            <SortableHeader field="n_installments">Parcelas</SortableHeader>
            <SortableHeader field="installment_value">Valor Parcela</SortableHeader>
            <SortableHeader field="entry_amount">Entrada</SortableHeader>
            <SortableHeader field="entry_percentage">% Entrada</SortableHeader>
            <SortableHeader field="monthly_rate">Taxa Mensal</SortableHeader>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
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
                className={`${isMine ? 'bg-muted/30' : ''} ${inCart ? 'bg-primary/5' : ''} cursor-pointer hover:bg-muted/50`}
                onClick={() => onViewDetails(listing)}
              >
                <TableCell className="font-medium">{listing.administrator}</TableCell>
                <TableCell>{formatCurrency(listing.credit_amount)}</TableCell>
                <TableCell>{formatCurrency(listing.outstanding_balance)}</TableCell>
                <TableCell>{listing.n_installments}x</TableCell>
                <TableCell>{formatCurrency(listing.installment_value)}</TableCell>
                <TableCell>{formatCurrency(listing.entry_amount)}</TableCell>
                <TableCell>{formatPercentage(listing.entry_percentage)}</TableCell>
                <TableCell>
                  {listing.monthly_rate
                    ? formatPercentage(listing.monthly_rate, 4)
                    : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(listing.status)}>
                    {getCotaStatusLabel(listing.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
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
                          <Badge variant="success" className="text-xs flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Na composição
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={canAdd ? 'outline' : 'ghost'}
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
                          className="bg-secondary hover:bg-secondary/90 text-white"
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
