import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  showPageInfo?: boolean
  showGoToPage?: boolean
  showFirstLast?: boolean
  windowSize?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showPageInfo = true,
  showGoToPage = true,
  showFirstLast = true,
  windowSize = 3,
}: PaginationProps) {
  const [inputValue, setInputValue] = React.useState(currentPage.toString())

  // Update input when currentPage changes externally
  React.useEffect(() => {
    setInputValue(currentPage.toString())
  }, [currentPage])

  // Calculate which pages to show - current page should be in the middle when possible
  const halfWindow = Math.floor(windowSize / 2)

  let windowStart: number
  let windowEnd: number

  if (totalPages <= windowSize) {
    // Show all pages if total is less than window size
    windowStart = 1
    windowEnd = totalPages
  } else if (currentPage <= halfWindow + 1) {
    // Near the beginning - show first windowSize pages
    windowStart = 1
    windowEnd = windowSize
  } else if (currentPage >= totalPages - halfWindow) {
    // Near the end - show last windowSize pages
    windowStart = totalPages - windowSize + 1
    windowEnd = totalPages
  } else {
    // In the middle - center current page
    windowStart = currentPage - halfWindow
    windowEnd = currentPage + halfWindow
  }

  // Generate page numbers for current window
  const pageNumbers: number[] = []
  for (let i = windowStart; i <= windowEnd; i++) {
    pageNumbers.push(i)
  }

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages
  const canGoFirst = currentPage > 1
  const canGoLast = currentPage < totalPages

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault()
    const pageNum = parseInt(inputValue, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum)
    } else {
      setInputValue(currentPage.toString())
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    const pageNum = parseInt(inputValue, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum)
    } else {
      setInputValue(currentPage.toString())
    }
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
    >
      {/* Page info - left side */}
      {showPageInfo && (
        <p className="text-sm text-muted-foreground order-2 sm:order-1">
          Página {currentPage} de {totalPages}
        </p>
      )}

      {/* Navigation controls - center */}
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {/* First page button */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canGoFirst}
            className="px-2"
            title="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className="px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Anterior</span>
        </Button>

        {/* Page number buttons */}
        <div className="flex gap-1">
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className="w-9"
            >
              {pageNum}
            </Button>
          ))}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={!canGoNext}
          className="px-2 sm:px-3"
        >
          <span className="hidden sm:inline mr-1">Próxima</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoLast}
            className="px-2"
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Go to page input - right side */}
      {showGoToPage && (
        <form
          onSubmit={handleGoToPage}
          className="flex items-center gap-2 order-3 text-sm"
        >
          <span className="text-muted-foreground whitespace-nowrap">Ir para:</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-16 h-8 text-center"
          />
          <span className="text-muted-foreground whitespace-nowrap">de {totalPages}</span>
        </form>
      )}
    </div>
  )
}
