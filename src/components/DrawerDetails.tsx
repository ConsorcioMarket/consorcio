'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatPercentage, getCotaStatusLabel } from '@/lib/utils'
import type { Cota } from '@/types/database'
import { AlertTriangle } from 'lucide-react'

interface DrawerDetailsProps {
  listing: Cota | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onInterest: (listingId: string) => void
  currentUserId?: string
}

export function DrawerDetails({
  listing,
  open,
  onOpenChange,
  onInterest,
  currentUserId,
}: DrawerDetailsProps) {
  if (!listing) return null

  const isMine = currentUserId === listing.seller_id
  const isReserved = listing.status === 'RESERVED'
  const canPropose = !isMine && !isReserved

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Detalhes da Cota</SheetTitle>
            <Badge variant={getStatusBadgeVariant(listing.status)}>
              {getCotaStatusLabel(listing.status)}
            </Badge>
          </div>
          <SheetDescription>
            {listing.administrator}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Main Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Valor do Crédito</p>
              <p className="text-xl font-bold text-[hsl(var(--primary))]">
                {formatCurrency(listing.credit_amount)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Entrada</p>
              <p className="text-xl font-bold text-[hsl(var(--primary))]">
                {formatCurrency(listing.entry_amount)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Financial Details */}
          <div className="space-y-3">
            <h4 className="font-semibold">Informações Financeiras</h4>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo Devedor</span>
              <span className="font-medium">{formatCurrency(listing.outstanding_balance)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Número de Parcelas</span>
              <span className="font-medium">{listing.n_installments}x</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor da Parcela</span>
              <span className="font-medium">{formatCurrency(listing.installment_value)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">% Entrada</span>
              <span className="font-medium">{formatPercentage(listing.entry_percentage)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa Mensal</span>
              <span className="font-medium">
                {listing.monthly_rate ? formatPercentage(listing.monthly_rate, 4) : '-'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Valores exatos serão confirmados após o vendedor enviar o extrato atualizado do consórcio.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {canPropose && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  onInterest(listing.id)
                  onOpenChange(false)
                }}
              >
                Tenho Interesse
              </Button>
            )}

            {isMine && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Esta é a sua cota. Você não pode criar uma proposta para ela.
                </p>
              </div>
            )}

            {isReserved && !isMine && (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Esta cota está reservada e não aceita novas propostas no momento.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
