import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
};

function getVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: Array<number | 'ellipsis'> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
        pages.push('ellipsis');
    }

    for (let page = start; page <= end; page++) {
        pages.push(page);
    }

    if (end < totalPages - 1) {
        pages.push('ellipsis');
    }

    pages.push(totalPages);
    return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
    if (totalPages <= 1) {
        return null;
    }

    const visiblePages = getVisiblePages(currentPage, totalPages);

    return (
        <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Pagination Navigation">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
                Previous
            </Button>

            {visiblePages.map((page, index) => {
                if (page === 'ellipsis') {
                    return (
                        <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground" aria-hidden="true">
                            <MoreHorizontal className="h-4 w-4" />
                        </span>
                    );
                }

                const isActive = page === currentPage;

                return (
                    <Button
                        key={page}
                        type="button"
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => onPageChange(page)}
                        aria-current={isActive ? 'page' : undefined}
                        className="min-w-9"
                    >
                        {page}
                    </Button>
                );
            })}

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    );
}