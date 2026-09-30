export { cn } from '@app/ui';

/**
 * 生成分页页码序列（1-based，中间用 '...' 省略）。
 *
 * @param currentPage - 当前页码（1 起）
 * @param totalPages - 总页数
 * @returns (number | '...')[]
 *
 * 例：
 * - ≤ 5 页        → [1, 2, 3, 4, 5]
 * - 靠近开头      → [1, 2, 3, 4, '...', 10]
 * - 居中          → [1, '...', 4, 5, 6, '...', 10]
 * - 靠近结尾      → [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;
  const rangeWithDots: (number | '...')[] = [];

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) rangeWithDots.push(i);
    return rangeWithDots;
  }

  rangeWithDots.push(1);

  if (currentPage <= 3) {
    for (let i = 2; i <= 4; i++) rangeWithDots.push(i);
    rangeWithDots.push('...', totalPages);
  } else if (currentPage >= totalPages - 2) {
    rangeWithDots.push('...');
    for (let i = totalPages - 3; i <= totalPages; i++) rangeWithDots.push(i);
  } else {
    rangeWithDots.push('...');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) rangeWithDots.push(i);
    rangeWithDots.push('...', totalPages);
  }

  return rangeWithDots;
}
