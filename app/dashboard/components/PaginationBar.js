"use client";

import { LIST_PAGE_SIZE, formatPageRangeLabel } from "../lib/listMeta";

export default function PaginationBar({
  page,
  lastPage,
  total,
  rowsOnPage,
  isLoading = false,
  onPageChange,
  perPage = LIST_PAGE_SIZE,
}) {
  if (isLoading || total <= 0) return null;

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 border-t border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:px-0">
      <p className="break-words text-xs text-zinc-500">
        {formatPageRangeLabel(page, rowsOnPage, total, perPage)}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:justify-end">
        <button
          type="button"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-2 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
        >
          Previous
        </button>
        <span className="whitespace-nowrap text-center text-xs text-zinc-600">
          Page {page} of {lastPage}
        </span>
        <button
          type="button"
          disabled={page >= lastPage || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-2 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
        >
          Next
        </button>
      </div>
    </div>
  );
}
