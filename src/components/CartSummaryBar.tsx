'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export function CartSummaryBar() {
  const router = useRouter()
  const { totals } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || totals.itemCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <ShoppingCart className="h-5 w-5" />
            <span>Composição ({totals.itemCount})</span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Crédito Total</p>
              <p className="font-bold text-primary">{formatCurrency(totals.totalCredit)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Entrada Total</p>
              <p className="font-bold text-primary">{formatCurrency(totals.totalEntry)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">% Entrada</p>
              <p className="font-bold text-primary">{formatPercentage(totals.combinedEntryPercentage)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Saldo Devedor</p>
              <p className="font-bold">{formatCurrency(totals.totalBalance)}</p>
            </div>
          </div>

          <div className="flex sm:hidden items-center gap-3 text-sm">
            <div className="text-center">
              <p className="font-bold text-primary">{formatCurrency(totals.totalCredit)}</p>
              <p className="text-muted-foreground text-xs">Crédito</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-primary">{formatPercentage(totals.combinedEntryPercentage)}</p>
              <p className="text-muted-foreground text-xs">Entrada</p>
            </div>
          </div>

          <Button
            onClick={() => router.push('/composicao-credito')}
            className="bg-secondary hover:bg-secondary/90 text-white flex-shrink-0"
          >
            <span className="hidden sm:inline">Fazer Proposta</span>
            <span className="sm:hidden">Proposta</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
