'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

export function CartIndicator() {
  const { items, totals, setIsOpen } = useCart()

  if (items.length === 0) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsOpen(true)}
      className="relative flex items-center gap-2"
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden sm:inline">
        {formatCurrency(totals.totalCredit)}
      </span>
      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {items.length}
      </span>
    </Button>
  )
}
