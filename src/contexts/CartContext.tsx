'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Cota } from '@/types/database'

interface CartItem extends Cota {
  addedAt: string
}

interface CartTotals {
  totalCredit: number
  totalBalance: number
  totalEntry: number
  combinedEntryPercentage: number
  itemCount: number
}

interface CartContextValue {
  items: CartItem[]
  totals: CartTotals
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  addItem: (cota: Cota) => { success: boolean; error?: string }
  removeItem: (cotaId: string) => void
  clearCart: () => void
  isInCart: (cotaId: string) => boolean
  canAddToCart: (cota: Cota) => { canAdd: boolean; reason?: string }
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

const CART_STORAGE_KEY = 'consorcio-market-cart'

function calculateTotals(items: CartItem[]): CartTotals {
  if (items.length === 0) {
    return {
      totalCredit: 0,
      totalBalance: 0,
      totalEntry: 0,
      combinedEntryPercentage: 0,
      itemCount: 0,
    }
  }

  const totalCredit = items.reduce((sum, item) => sum + item.credit_amount, 0)
  const totalBalance = items.reduce((sum, item) => sum + item.outstanding_balance, 0)
  const totalEntry = items.reduce((sum, item) => sum + item.entry_amount, 0)
  const combinedEntryPercentage = totalCredit > 0 ? (totalEntry / totalCredit) * 100 : 0

  return {
    totalCredit,
    totalBalance,
    totalEntry,
    combinedEntryPercentage,
    itemCount: items.length,
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error)
    }
    setIsInitialized(true)
  }, [])

  // Save cart to localStorage when items change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      } catch (error) {
        console.error('Error saving cart to storage:', error)
      }
    }
  }, [items, isInitialized])

  const totals = calculateTotals(items)

  const isInCart = useCallback((cotaId: string) => {
    return items.some((item) => item.id === cotaId)
  }, [items])

  const canAddToCart = useCallback((cota: Cota): { canAdd: boolean; reason?: string } => {
    // Check if already in cart
    if (isInCart(cota.id)) {
      return { canAdd: false, reason: 'Esta cota já está na sua composição.' }
    }

    // Check if cota is available
    if (cota.status !== 'AVAILABLE') {
      return { canAdd: false, reason: 'Esta cota não está disponível.' }
    }

    // Check administrator rule: all cotas must have the same administrator
    if (items.length > 0) {
      const currentAdministrator = items[0].administrator
      if (cota.administrator !== currentAdministrator) {
        return {
          canAdd: false,
          reason: `Todas as cotas da composição devem ser da mesma administradora. Sua composição atual é de "${currentAdministrator}".`,
        }
      }
    }

    return { canAdd: true }
  }, [items, isInCart])

  const addItem = useCallback((cota: Cota): { success: boolean; error?: string } => {
    const { canAdd, reason } = canAddToCart(cota)

    if (!canAdd) {
      return { success: false, error: reason }
    }

    const cartItem: CartItem = {
      ...cota,
      addedAt: new Date().toISOString(),
    }

    setItems((prev) => [...prev, cartItem])
    return { success: true }
  }, [canAddToCart])

  const removeItem = useCallback((cotaId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== cotaId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    // Also clear localStorage immediately to prevent race conditions
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cart from storage:', error)
    }
  }, [])

  return (
    <CartContext.Provider
      value={{
        items,
        totals,
        isOpen,
        setIsOpen,
        addItem,
        removeItem,
        clearCart,
        isInCart,
        canAddToCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
