import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'

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
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <footer className="bg-gray-900 text-white py-12">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Consórcio Market</h3>
                  <p className="text-gray-400 text-sm">
                    O primeiro marketplace seguro e transparente para compra e venda de
                    cotas de consórcio contempladas.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Links Úteis</h3>
                  <ul className="space-y-2 text-gray-400 text-sm">
                    <li>
                      <a href="/cotas" className="hover:text-white transition-colors">
                        Cotas Disponíveis
                      </a>
                    </li>
                    <li>
                      <a href="/cadastro" className="hover:text-white transition-colors">
                        Criar Conta
                      </a>
                    </li>
                    <li>
                      <a href="/publicar-cota" className="hover:text-white transition-colors">
                        Anunciar Cota
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contato</h3>
                  <p className="text-gray-400 text-sm">
                    contato@consorciomarket.com.br
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Consórcio Market. Todos os direitos reservados.</p>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
