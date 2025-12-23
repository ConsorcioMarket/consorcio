'use client'

import Link from 'next/link'
import { X, Trash2, ShoppingCart, ArrowRight, CheckCircle2, Circle, LogIn } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export function CartDrawer() {
  const { items, totals, isOpen, setIsOpen, removeItem, clearCart } = useCart()
  const { user } = useAuth()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Composição de Crédito
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? 'Adicione cotas para compor seu crédito'
              : `${items.length} ${items.length === 1 ? 'cota' : 'cotas'} selecionada${items.length === 1 ? '' : 's'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Sua composição está vazia.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Navegue pelas cotas disponíveis e clique em &quot;Adicionar à Composição&quot;.
              </p>
              <Button variant="outline" onClick={() => setIsOpen(false)} asChild>
                <Link href="/">Ver Cotas Disponíveis</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Administrator badge */}
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-1">Administradora</p>
                <Badge variant="outline" className="text-sm">
                  {items[0].administrator}
                </Badge>
              </div>

              {/* Cart items */}
              <div className="space-y-3 animate-stagger">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border rounded-lg p-4 relative group transition-all duration-200 hover:shadow-md hover:border-primary/30"
                  >
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                      title="Remover"
                      aria-label="Remover cota"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div className="pr-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-primary">
                            {formatCurrency(item.credit_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Crédito
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(item.entry_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Entrada ({formatPercentage(item.entry_percentage)})
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Saldo: {formatCurrency(item.outstanding_balance)}</span>
                        <span>{item.n_installments}x de {formatCurrency(item.installment_value)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clear cart button */}
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Composição
                </Button>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <>
            <Separator />

            {/* Step Indicators */}
            <div className="py-4">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Próximos passos:</p>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 font-medium">1. Selecionar cotas</span>
                </div>
                <div className="flex-1 h-px bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">2. Escolher comprador</span>
                </div>
                <div className="flex-1 h-px bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">3. Enviar proposta</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crédito Total</span>
                <span className="font-semibold text-primary text-lg">
                  {formatCurrency(totals.totalCredit)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entrada Total</span>
                <span className="font-medium">
                  {formatCurrency(totals.totalEntry)}
                  <span className="text-muted-foreground ml-1">
                    ({formatPercentage(totals.combinedEntryPercentage)})
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Devedor Total</span>
                <span className="font-medium">{formatCurrency(totals.totalBalance)}</span>
              </div>
            </div>

            <SheetFooter className="flex-col gap-2 sm:flex-col">
              {user ? (
                <>
                  <Button className="w-full press-effect hover-lift" onClick={() => setIsOpen(false)} asChild>
                    <Link href="/composicao-credito">
                      Continuar para Escolher Comprador
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Na próxima etapa você escolherá se a compra será como PF ou PJ
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2 text-amber-800">
                      <LogIn className="h-4 w-4 shrink-0" />
                      <p className="text-sm font-medium">
                        Faça login para continuar com sua proposta
                      </p>
                    </div>
                    <p className="text-xs text-amber-700 mt-1 ml-6">
                      Você precisa estar logado para enviar propostas de compra.
                    </p>
                  </div>
                  <Button className="w-full press-effect hover-lift" onClick={() => setIsOpen(false)} asChild>
                    <Link href="/login?returnUrl=/composicao-credito">
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar para Continuar
                    </Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Não tem conta? <Link href="/cadastro" className="text-primary hover:underline" onClick={() => setIsOpen(false)}>Cadastre-se aqui</Link>
                  </p>
                </>
              )}
              <Button
                variant="outline"
                className="w-full transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Continuar Navegando
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
