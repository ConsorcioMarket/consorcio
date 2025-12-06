'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { ListingFilters } from '@/hooks/useListings'

interface FiltersPanelProps {
  filters: ListingFilters
  onFiltersChange: (filters: ListingFilters) => void
  onApplyFilters: () => void
  onClearFilters: () => void
  administradoras: string[]
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  administradoras,
}: FiltersPanelProps) {
  const updateFilter = <K extends keyof ListingFilters>(
    key: K,
    value: ListingFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const parseNumberOrNull = (value: string): number | null => {
    const num = parseFloat(value)
    return isNaN(num) ? null : num
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <Separator />
      </div>

      {/* Administradora */}
      <div className="space-y-2">
        <Label htmlFor="administrator">Administradora</Label>
        <select
          id="administrator"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filters.administrator}
          onChange={(e) => updateFilter('administrator', e.target.value)}
        >
          <option value="">Todas</option>
          {administradoras.map((admin) => (
            <option key={admin} value={admin}>
              {admin}
            </option>
          ))}
        </select>
      </div>

      {/* Crédito */}
      <div className="space-y-2">
        <Label>Valor do Crédito</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Mínimo"
            value={filters.creditMin || ''}
            onChange={(e) => updateFilter('creditMin', parseNumberOrNull(e.target.value))}
          />
          <Input
            type="number"
            placeholder="Máximo"
            value={filters.creditMax || ''}
            onChange={(e) => updateFilter('creditMax', parseNumberOrNull(e.target.value))}
          />
        </div>
      </div>

      {/* Saldo Devedor */}
      <div className="space-y-2">
        <Label>Saldo Devedor</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Mínimo"
            value={filters.balanceMin || ''}
            onChange={(e) => updateFilter('balanceMin', parseNumberOrNull(e.target.value))}
          />
          <Input
            type="number"
            placeholder="Máximo"
            value={filters.balanceMax || ''}
            onChange={(e) => updateFilter('balanceMax', parseNumberOrNull(e.target.value))}
          />
        </div>
      </div>

      {/* Entrada */}
      <div className="space-y-2">
        <Label>Valor da Entrada</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Mínimo"
            value={filters.entryMin || ''}
            onChange={(e) => updateFilter('entryMin', parseNumberOrNull(e.target.value))}
          />
          <Input
            type="number"
            placeholder="Máximo"
            value={filters.entryMax || ''}
            onChange={(e) => updateFilter('entryMax', parseNumberOrNull(e.target.value))}
          />
        </div>
      </div>

      {/* % Entrada */}
      <div className="space-y-2">
        <Label>% Entrada</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Mín %"
            value={filters.entryPercentMin || ''}
            onChange={(e) => updateFilter('entryPercentMin', parseNumberOrNull(e.target.value))}
          />
          <Input
            type="number"
            placeholder="Máx %"
            value={filters.entryPercentMax || ''}
            onChange={(e) => updateFilter('entryPercentMax', parseNumberOrNull(e.target.value))}
          />
        </div>
      </div>

      {/* Parcelas */}
      <div className="space-y-2">
        <Label>Número de Parcelas</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Mínimo"
            value={filters.installmentsMin || ''}
            onChange={(e) => updateFilter('installmentsMin', parseNumberOrNull(e.target.value))}
          />
          <Input
            type="number"
            placeholder="Máximo"
            value={filters.installmentsMax || ''}
            onChange={(e) => updateFilter('installmentsMax', parseNumberOrNull(e.target.value))}
          />
        </div>
      </div>

      {/* Taxa Mensal */}
      <div className="space-y-2">
        <Label>Taxa Mensal (%)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="0.01"
            placeholder="Mín %"
            value={filters.rateMin || ''}
            onChange={(e) => updateFilter('rateMin', parseNumberOrNull(e.target.value))}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Máx %"
            value={filters.rateMax || ''}
            onChange={(e) => updateFilter('rateMax', parseNumberOrNull(e.target.value))}
          />
        </div>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button className="w-full" onClick={onApplyFilters}>
          Aplicar Filtros
        </Button>
        <Button variant="outline" className="w-full" onClick={onClearFilters}>
          Limpar Filtros
        </Button>
      </div>
    </div>
  )
}
