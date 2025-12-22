import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { Header } from '@/components/Header'
import { CartDrawer } from '@/components/CartDrawer'
import { ToastProvider } from '@/components/ui/toast'
import { AdminStatusBar } from '@/components/AdminStatusBar'
import { WhatsAppFloater } from '@/components/WhatsAppFloater'
import { CartSummaryBar } from '@/components/CartSummaryBar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Consórcio Market - Marketplace de Cotas de Consórcio Contempladas',
  description:
    'Compre e venda cotas de consórcio contempladas com segurança. Marketplace seguro para negociação de cotas contempladas de imóveis.',
  keywords: [
    'consórcio',
    'cota contemplada',
    'carta de crédito',
    'imóveis',
    'marketplace',
    'comprar cota',
    'vender cota',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" translate="no" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <Header />
              <CartDrawer />
              <main className="pb-20">{children}</main>
              <AdminStatusBar />
              <CartSummaryBar />
              <WhatsAppFloater phoneNumber="5513991053598" />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
