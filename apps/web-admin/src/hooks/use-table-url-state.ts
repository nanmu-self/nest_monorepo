import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';

/**
 * 把表格的分页 / 搜索 / 列过滤状态同步到 URL query。
 *
 * 为什么状态放 URL 而不是 useState：
 * - 刷新、分享链接、前进后退都能还原用户看到的视图；
 * - 后端分页接口的入参天然就是 query，这里不再需要"把 URL 解析成 state"的中间层。
 *
 * 与原版（shadcn-admin）的两处刻意差异：
 * 1. 基于 react-router 的 `useSearchParams`，而不是 TanStack Router 的 `navigate({search})`。
 * 2. 全局搜索走防抖 + `replace: true`。原版每次击键都 push 一条 history，
 *    点一次后退要按几十次；这里改成"停止输入后才写 URL，且不新增历史条目"。
 *    翻页仍然 push，因为"翻到第 3 页"是一个用户会想回去的动作。
 */

/** 单个列过滤器的 URL 映射声明 */
export type ColumnFilterUrlConfig = {
  /** TanStack Table 的列 id */
  columnId: string;
  /** URL query 参数名 */
  searchKey: string;
  /** 值形态：单值字符串（搜索框）或数组（下拉多选） */
  type: 'string' | 'array';
  /** 自定义序列化（默认原样） */
  serialize?: (value: unknown) => unknown;
  /** 自定义反序列化（默认原样） */
  deserialize?: (value: unknown) => unknown;
};

type UseTableUrlStateParams = {
  pagination?: {
    pageKey?: string;
    pageSizeKey?: string;
    defaultPage?: number;
    defaultPageSize?: number;
  };
  globalFilter?: {
    enabled?: boolean;
    key?: string;
    trim?: boolean;
    /** 防抖时长（ms），默认 300 */
    debounceMs?: number;
  };
  columnFilters?: ColumnFilterUrlConfig[];
};

type UseTableUrlStateReturn = {
  /** 搜索框的受控值：随击键立即变化，保证输入手感 */
  globalFilter: string;
  /** 防抖后的搜索词：作为列表请求的依赖，才是"真正生效的搜索" */
  deferredGlobalFilter: string;
  onGlobalFilterChange: OnChangeFn<string>;

  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;

  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;

  /** 数据变少导致当前页越界时（如删掉末页最后一条），把页码拉回有效范围 */
  ensurePageInRange: (pageCount: number) => void;
};

export function useTableUrlState({
  pagination: paginationCfg,
  globalFilter: globalFilterCfg,
  columnFilters: columnFiltersCfg = [],
}: UseTableUrlStateParams): UseTableUrlStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageKey = paginationCfg?.pageKey ?? 'page';
  const pageSizeKey = paginationCfg?.pageSizeKey ?? 'pageSize';
  const defaultPage = paginationCfg?.defaultPage ?? 1;
  const defaultPageSize = paginationCfg?.defaultPageSize ?? 10;

  const globalFilterEnabled = globalFilterCfg?.enabled ?? true;
  const globalFilterKey = globalFilterCfg?.key ?? 'filter';
  const trimGlobal = globalFilterCfg?.trim ?? true;
  const debounceMs = globalFilterCfg?.debounceMs ?? 300;

  /** 改 URL 的统一入口：默认 replace，避免污染历史记录 */
  const patchParams = useCallback(
    (patch: Record<string, string | undefined>, options?: { replace?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '') next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: options?.replace ?? true },
      );
    },
    [setSearchParams],
  );

  /* ---------------- 全局搜索：即时值 + 防抖生效值 ---------------- */

  const [globalFilter, setGlobalFilter] = useState<string>(() =>
    globalFilterEnabled ? (searchParams.get(globalFilterKey) ?? '') : '',
  );
  const [deferredGlobalFilter, setDeferredGlobalFilter] = useState<string>(globalFilter);

  // URL -> state：用户按浏览器前进/后退时把外部值同步进来。
  // 用 ref 记住上次读到的值，避免 searchParams 每次渲染都是新对象导致死循环。
  const lastSyncedFromUrl = useRef(searchParams.get(globalFilterKey) ?? '');
  useEffect(() => {
    const raw = searchParams.get(globalFilterKey) ?? '';
    if (raw !== lastSyncedFromUrl.current) {
      lastSyncedFromUrl.current = raw;
      setGlobalFilter(raw);
      setDeferredGlobalFilter(raw);
    }
  }, [searchParams, globalFilterKey]);

  // state -> URL：防抖后再写回，保证只产生一次请求、一次历史记录。
  useEffect(() => {
    if (!globalFilterEnabled) return;
    if (globalFilter === deferredGlobalFilter) return;
    const timer = setTimeout(() => {
      // trim：把首尾空格去掉再写回，否则“ abc ”与“abc” 会被当成两个不同的查询，
      // 且 URL 里会出现一堆 %20
      const value = trimGlobal ? globalFilter.trim() : globalFilter;
      setDeferredGlobalFilter(value);
      lastSyncedFromUrl.current = value;
      // 搜索条件变化时回到第一页：否则会停在一个已经不存在的页码上
      patchParams({ [globalFilterKey]: value, [pageKey]: undefined });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [
    globalFilter,
    deferredGlobalFilter,
    globalFilterEnabled,
    globalFilterKey,
    pageKey,
    trimGlobal,
    debounceMs,
    patchParams,
  ]);

  const onGlobalFilterChange: OnChangeFn<string> = useCallback((updater) => {
    setGlobalFilter((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  /* ---------------- 分页：URL 是唯一真理源 ---------------- */

  const pagination: PaginationState = useMemo(() => {
    const rawPage = Number(searchParams.get(pageKey));
    const rawPageSize = Number(searchParams.get(pageSizeKey));
    const pageNum = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : defaultPage;
    const pageSizeNum =
      Number.isFinite(rawPageSize) && rawPageSize > 0 ? rawPageSize : defaultPageSize;
    // 后端约定页码从 1 开始，TanStack 用 0-based 的 pageIndex
    return { pageIndex: pageNum - 1, pageSize: pageSizeNum };
  }, [searchParams, pageKey, pageSizeKey, defaultPage, defaultPageSize]);

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      patchParams(
        {
          [pageKey]: String(next.pageIndex + 1),
          [pageSizeKey]: String(next.pageSize),
        },
        // 翻页 push 历史：用户会想用浏览器"后退"回到上一页
        { replace: false },
      );
    },
    [pagination, pageKey, pageSizeKey, patchParams],
  );

  /* ---------------- 列过滤（faceted filter 用） ---------------- */

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const collected: ColumnFiltersState = [];
    for (const cfg of columnFiltersCfg) {
      const deserialize = cfg.deserialize ?? ((v: unknown) => v);
      if (cfg.type === 'string') {
        const value = (deserialize(searchParams.get(cfg.searchKey)) as string) ?? '';
        if (value.trim() !== '') collected.push({ id: cfg.columnId, value });
      } else {
        const raw = searchParams.getAll(cfg.searchKey);
        if (raw.length > 0) collected.push({ id: cfg.columnId, value: raw });
      }
    }
    return collected;
  }, [columnFiltersCfg, searchParams]);

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      const patch: Record<string, string[] | undefined> = { [pageKey]: undefined };

      for (const cfg of columnFiltersCfg) {
        const found = next.find((f) => f.id === cfg.columnId);
        const serialize = cfg.serialize ?? ((v: unknown) => v);
        if (cfg.type === 'string') {
          const value = typeof found?.value === 'string' ? found.value : '';
          patch[cfg.searchKey] = value.trim() !== '' ? [serialize(value) as string] : undefined;
        } else {
          const value = Array.isArray(found?.value) ? (found.value as unknown[]) : [];
          patch[cfg.searchKey] = value.length > 0 ? (serialize(value) as string[]) : undefined;
        }
      }

      setSearchParams((prev) => {
        const nextParams = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          nextParams.delete(key);
          for (const v of value ?? []) nextParams.append(key, v);
        }
        return nextParams;
      });
    },
    [columnFilters, columnFiltersCfg, pageKey, setSearchParams],
  );

  /* ---------------- 越界兜底 ---------------- */

  const ensurePageInRange = useCallback(
    (pageCount: number) => {
      const currentPage = pagination.pageIndex + 1;
      if (pageCount > 0 && currentPage > pageCount) {
        patchParams({ [pageKey]: String(pageCount) });
      }
    },
    [pagination.pageIndex, pageKey, patchParams],
  );

  return {
    globalFilter: globalFilterEnabled ? globalFilter : '',
    deferredGlobalFilter: globalFilterEnabled ? deferredGlobalFilter : '',
    onGlobalFilterChange: globalFilterEnabled ? onGlobalFilterChange : () => undefined,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  };
}
