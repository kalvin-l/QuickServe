'use client'

interface MenuPaginationProps {
  currentPage: number
  totalPages: number
  filteredItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  canGoToPreviousPage: boolean
  canGoToNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

export function MenuPagination({
  currentPage,
  totalPages,
  filteredItems,
  itemsPerPage,
  onPageChange,
  canGoToPreviousPage,
  canGoToNextPage,
  onPreviousPage,
  onNextPage,
}: MenuPaginationProps) {
  // Generate page numbers to show (max 5)
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (filteredItems <= itemsPerPage) {
    return null
  }

  return (
    <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-[#5c5752]">
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredItems)} to{' '}
        {Math.min(currentPage * itemsPerPage, filteredItems)} of {filteredItems} items
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPreviousPage}
          disabled={!canGoToPreviousPage}
          className="px-3 py-2 rounded-lg border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-[#8b8680]">
                  ...
                </span>
              )
            }
            return (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                  currentPage === page
                    ? 'bg-[#d4a574] text-white'
                    : 'border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7]'
                }`}
              >
                {page}
              </button>
            )
          })}
        </div>
        <button
          onClick={onNextPage}
          disabled={!canGoToNextPage}
          className="px-3 py-2 rounded-lg border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
        >
          Next
        </button>
      </div>
    </div>
  )
}
