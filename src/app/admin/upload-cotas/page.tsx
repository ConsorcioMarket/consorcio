'use client'

import { useState, useRef } from 'react'
import { Upload, Save, Loader2, Trash2, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import * as XLSX from 'xlsx'

interface CotaRow {
  creditAmount: number
  entryAmount: number
  administrator: string
  nInstallments: number
  installmentValue: number
  monthlyRate: number
  entryPercentage: number
  outstandingBalance: number
}

function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value
  // Remove "R$", spaces, dots (thousands separator), and replace comma with dot
  const cleaned = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim()
  return parseFloat(cleaned) || 0
}

function parsePercentage(value: string | number): number {
  if (typeof value === 'number') return value * 100 // Excel stores as decimal
  const cleaned = value.replace('%', '').replace(',', '.').trim()
  return parseFloat(cleaned) || 0
}

export default function UploadCotasPage() {
  const { addToast } = useToast()
  const [cotas, setCotas] = useState<CotaRow[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

      const parsedCotas: CotaRow[] = jsonData.map((row) => ({
        creditAmount: parseCurrency(row['Credito'] as string | number),
        entryAmount: parseCurrency(row['Entrada'] as string | number),
        administrator: (row['Administradora'] as string) || 'Caixa Consórcios',
        nInstallments: parseInt(String(row['N_Parcelas'])) || 0,
        installmentValue: parseCurrency(row['Valor_Parcela'] as string | number),
        monthlyRate: parsePercentage(row['Taxa'] as string | number),
        entryPercentage: parsePercentage(row['Percent_Entrada'] as string | number),
        outstandingBalance: parseCurrency(row['Saldo_Devedor'] as string | number),
      }))

      setCotas(parsedCotas)
      addToast({
        title: 'Arquivo carregado',
        description: `${parsedCotas.length} cotas encontradas.`,
        variant: 'success',
      })
    }
    reader.readAsArrayBuffer(file)
  }

  const handleSave = async () => {
    if (cotas.length === 0) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/upload-cotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotas }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar')
      }

      addToast({
        title: 'Sucesso!',
        description: `${result.count} cotas salvas com sucesso.`,
        variant: 'success',
      })
      setCotas([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      addToast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar cotas',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = () => {
    setCotas([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload de Cotas</h1>
        <p className="text-muted-foreground">Importe cotas a partir de arquivo Excel</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Selecionar Arquivo Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Colunas esperadas: Credito, Entrada, Administradora, N_Parcelas, Valor_Parcela, Taxa, Percent_Entrada, Saldo_Devedor
          </p>
        </CardContent>
      </Card>

      {cotas.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cotas Carregadas ({cotas.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Todas
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Administradora</th>
                    <th className="text-right p-3">Crédito</th>
                    <th className="text-right p-3">Entrada</th>
                    <th className="text-center p-3">Parcelas</th>
                    <th className="text-right p-3">Valor Parcela</th>
                    <th className="text-center p-3">Taxa</th>
                    <th className="text-center p-3">% Entrada</th>
                    <th className="text-right p-3">Saldo Devedor</th>
                  </tr>
                </thead>
                <tbody>
                  {cotas.map((cota, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-muted-foreground">{index + 1}</td>
                      <td className="p-3">{cota.administrator}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(cota.creditAmount)}</td>
                      <td className="p-3 text-right">{formatCurrency(cota.entryAmount)}</td>
                      <td className="p-3 text-center">{cota.nInstallments}x</td>
                      <td className="p-3 text-right">{formatCurrency(cota.installmentValue)}</td>
                      <td className="p-3 text-center">{cota.monthlyRate.toFixed(2)}%</td>
                      <td className="p-3 text-center">{cota.entryPercentage.toFixed(2)}%</td>
                      <td className="p-3 text-right">{formatCurrency(cota.outstandingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
