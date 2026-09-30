import { useEffect, useMemo } from 'react';
import { useWatcher } from 'alova/client';
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';

import { getUsers } from '@/api/users';
import { useTableUrlState } from '@/hooks/use-table-url-state';

export type UsersListQuery = ReturnType<typeof useUsersList>;

/**
 * 用户列表的数据源。
 *
 * 把「URL 状态 -> 请求 -> 派生量」这一步集中在这里，页面组件只做布局。
 * 关键点：useTableUrlState 只在**这一个** hook 里调用一次 ——
 * 它的内部有本地 state + 防抖定时器，多处调用会出现多个定时器互相打架、
 * 请求延迟叠加。表格组件通过 props 接收结果，不再自己调。
 */
export function useUsersList() {
  const {
    globalFilter,
    deferredGlobalFilter,
    onGlobalFilterChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { key: 'search', debounceMs: 300 },
  });

  // 后端 page 从 1 开始，TanStack 的 pageIndex 从 0 开始
  const page = pagination.pageIndex + 1;

  const { data, loading, error } = useWatcher(
    () =>
      getUsers({ page, pageSize: pagination.pageSize, search: deferredGlobalFilter || undefined }),
    [page, pagination.pageSize, deferredGlobalFilter],
    { immediate: true },
  );

  const rows = useMemo(() => data?.list ?? [], [data]);
  const total = data?.total ?? 0;
  // 至少为 1：total 为 0 时若返回 0 页，table 会认为自己在非法页码上
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  // 删除数据 / 改筛选后可能停在越界页码上，拉回有效范围
  useEffect(() => {
    if (!loading && !error) ensurePageInRange(pageCount);
  }, [loading, error, pageCount, ensurePageInRange]);

  return {
    /** 搜索框受控值：随击键立即变化 */
    search: globalFilter,
    setSearch: onGlobalFilterChange,
    /** 实际生效的搜索词（已防抖），用于空状态的提示文案 */
    appliedSearch: deferredGlobalFilter,
    rows,
    total,
    pageCount,
    pagination,
    onPaginationChange: onPaginationChange as OnChangeFn<PaginationState>,
    loading,
    error: error as Error | null,
  };
}
