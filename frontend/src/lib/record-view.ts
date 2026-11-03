export function recordPage<T>(records: T[], page: number) {
  const total = records.length, totalPages = Math.max(1, Math.ceil(total / 10));
  const current = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), totalPages);
  const start = (current - 1) * 10;
  const pages: (number | 'ellipsis')[] = [];
  for (let number = 1; number <= totalPages; number++) {
    if (number === 1 || number === totalPages || Math.abs(number - current) <= 1) pages.push(number);
    else if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
  }
  return { rows: records.slice(start, start + 10), current, total, totalPages, start: total ? start + 1 : 0, end: Math.min(start + 10, total), pages };
}
