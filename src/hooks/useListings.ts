'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cota, CotaStatus } from '@/types/database'

export interface ListingFilters {
  administrator: string
  creditMin: number | null
  creditMax: number | null
  balanceMin: number | null
  balanceMax: number | null
  entryMin: number | null
  entryMax: number | null
  entryPercentMin: number | null
  entryPercentMax: number | null
  installmentsMin: number | null
  installmentsMax: number | null
  rateMin: number | null
  rateMax: number | null
}

export type SortField =
  | 'administrator'
  | 'credit_amount'
  | 'outstanding_balance'
  | 'n_installments'
  | 'installment_value'
  | 'entry_amount'
  | 'entry_percentage'
  | 'monthly_rate'

export type SortDirection = 'asc' | 'desc'

const defaultFilters: ListingFilters = {
  administrator: '',
  creditMin: null,
  creditMax: null,
  balanceMin: null,
  balanceMax: null,
  entryMin: null,
  entryMax: null,
  entryPercentMin: null,
  entryPercentMax: null,
  installmentsMin: null,
  installmentsMax: null,
  rateMin: null,
  rateMax: null,
}

const PAGE_SIZE = 20

export function useListings() {
  const [listings, setListings] = useState<Cota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [administrators, setAdministrators] = useState<string[]>([])
  const [filters, setFilters] = useState<ListingFilters>(defaultFilters)
  const [sortField, setSortField] = useState<SortField>('credit_amount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createClient()

  // Helper to build filtered query
  const buildFilteredQuery = useCallback(() => {
    let query = supabase
      .from('cotas')
      .select('*', { count: 'exact' })
      .in('status', ['AVAILABLE', 'RESERVED'] as CotaStatus[])

    if (filters.administrator) {
      query = query.eq('administrator', filters.administrator)
    }
    if (filters.creditMin !== null) {
      query = query.gte('credit_amount', filters.creditMin)
    }
    if (filters.creditMax !== null) {
      query = query.lte('credit_amount', filters.creditMax)
    }
    if (filters.balanceMin !== null) {
      query = query.gte('outstanding_balance', filters.balanceMin)
    }
    if (filters.balanceMax !== null) {
      query = query.lte('outstanding_balance', filters.balanceMax)
    }
    if (filters.entryMin !== null) {
      query = query.gte('entry_amount', filters.entryMin)
    }
    if (filters.entryMax !== null) {
      query = query.lte('entry_amount', filters.entryMax)
    }
    if (filters.entryPercentMin !== null) {
      query = query.gte('entry_percentage', filters.entryPercentMin)
    }
    if (filters.entryPercentMax !== null) {
      query = query.lte('entry_percentage', filters.entryPercentMax)
    }
    if (filters.installmentsMin !== null) {
      query = query.gte('n_installments', filters.installmentsMin)
    }
    if (filters.installmentsMax !== null) {
      query = query.lte('n_installments', filters.installmentsMax)
    }
    if (filters.rateMin !== null) {
      query = query.gte('monthly_rate', filters.rateMin)
    }
    if (filters.rateMax !== null) {
      query = query.lte('monthly_rate', filters.rateMax)
    }

    return query
  }, [supabase, filters])

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const query = buildFilteredQuery()
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range(from, to)

      const { data: listingsData, error: queryError, count } = await query

      if (queryError) {
        throw queryError
      }

      setListings(listingsData || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching listings:', err)
      setError('Erro ao carregar cotas. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [buildFilteredQuery, sortField, sortDirection, page])

  const fetchAdministrators = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cotas')
        .select('administrator')
        .in('status', ['AVAILABLE', 'RESERVED'] as CotaStatus[])

      if (error) throw error

      const uniqueAdmins = [...new Set(data?.map(d => d.administrator) || [])]
      setAdministrators(uniqueAdmins.sort())
    } catch (err) {
      console.error('Error fetching administrators:', err)
    }
  }, [supabase])

  useEffect(() => {
    fetchListings()
    fetchAdministrators()
  }, [fetchListings, fetchAdministrators])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const applyFilters = () => {
    setPage(1) // Reset to first page when applying filters
    fetchListings()
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  return {
    listings,
    loading,
    error,
    administrators,
    filters,
    setFilters,
    sortField,
    sortDirection,
    handleSort,
    applyFilters,
    clearFilters,
    refetch: fetchListings,
    // Pagination
    page,
    totalPages,
    totalCount,
    goToPage,
    pageSize: PAGE_SIZE,
  }
}
