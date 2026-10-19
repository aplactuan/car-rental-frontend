export const LIST_PAGE_SIZE = 10;

export function extractListMeta(payload) {
  const meta = payload?.meta;
  if (meta && typeof meta === "object") {
    return {
      currentPage: Math.max(1, Number(meta.current_page) || 1),
      lastPage: Math.max(1, Number(meta.last_page) || 1),
      total: Math.max(0, Number(meta.total) || 0),
    };
  }

  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return {
    currentPage: 1,
    lastPage: 1,
    total: list.length,
  };
}

export function formatPageRangeLabel(
  page,
  rowsOnPage,
  total,
  perPage = LIST_PAGE_SIZE,
) {
  if (total <= 0 || rowsOnPage <= 0) return "";
  const from = (page - 1) * perPage + 1;
  const to = from + rowsOnPage - 1;
  return `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`;
}
