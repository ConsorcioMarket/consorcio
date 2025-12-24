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

        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 animate-fade-in-up">
          {/* Main Values */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg transition-all duration-200 hover:shadow-md">
              <p className="text-xs sm:text-sm text-muted-foreground">Valor do Crédito</p>
              <p className="text-base sm:text-xl font-bold text-primary tabular-nums break-all">
                {formatCurrency(listing.credit_amount)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg transition-all duration-200 hover:shadow-md">
              <p className="text-xs sm:text-sm text-muted-foreground">Entrada</p>
              <p className="text-base sm:text-xl font-bold text-primary tabular-nums break-all">
                {formatCurrency(listing.entry_amount)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Financial Details */}
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-semibold text-sm sm:text-base">Informações Financeiras</h4>

            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-sm">Saldo Devedor</span>
              <span className="font-medium text-sm sm:text-base text-right">{formatCurrency(listing.outstanding_balance)}</span>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-sm">Número de Parcelas</span>
              <span className="font-medium text-sm sm:text-base">{listing.n_installments}x</span>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-sm">Valor da Parcela</span>
              <span className="font-medium text-sm sm:text-base text-right">{formatCurrency(listing.installment_value)}</span>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-sm">% Entrada</span>
              <span className="font-medium text-sm sm:text-base">{formatPercentage(listing.entry_percentage)}</span>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-sm">Taxa Mensal</span>
              <span className="font-medium text-sm sm:text-base">
                {listing.monthly_rate ? formatPercentage(listing.monthly_rate, 4) : '-'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-yellow-800">
              Valores exatos serão confirmados após o vendedor enviar o extrato atualizado do consórcio.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3">
            {canPropose && (
              <Button
                className="w-full press-effect hover-lift text-sm sm:text-base"
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
              <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Esta é a sua cota. Você não pode criar uma proposta para ela.
                </p>
              </div>
            )}

            {isReserved && !isMine && (
              <div className="text-center p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs sm:text-sm text-yellow-800">
                  Esta cota está reservada e não aceita novas propostas no momento.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full text-sm sm:text-base"
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
