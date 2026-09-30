import { useEffect, useMemo, useState } from 'react';
import { useWatcher } from 'alova/client';
import { Inbox, Search, TriangleAlert } from 'lucide-react';
import { Button } from '@app/ui';

import { getUsers } from '@/api/users';

const DEFAULT_PAGE_SIZE = 10;

/** 页码起始（后端约定从 1 开始） */
const FIRST_PAGE = 1;

/** 可用每页条数选项 */
const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** 搜索防抖时长（ms）：停止输入后才发起请求 */
const SEARCH_DEBOUNCE = 300;

export default function UsersPage() {
  const [page, setPage] = useState(FIRST_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  /** 防抖后的搜索词：唯一驱动请求的搜索值，避免每次击键都发请求 */
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 搜索防抖：停止输入 300ms 后生效，同时回到第一页（挂载时 setPage(1) 是 no-op）。
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(FIRST_PAGE);
    }, SEARCH_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [search]);

  // useWatcher（而非 useRequest + 手动 send）：
  // 1. 监听 [page, pageSize, debouncedSearch]，任一变化自动重新请求，无需手动 send；
  // 2. alova 默认 abortLast —— 只有最后一次请求的响应会写入状态，
  //    连续翻页/搜索时旧请求的迟到响应不会覆盖新数据（竞态防护）。
  const { data, loading, error } = useWatcher(
    () => getUsers({ page, pageSize, search: debouncedSearch || undefined }),
    [page, pageSize, debouncedSearch],
    { immediate: true },
  );

  // 后端返回过滤后的真实 total，页数不再靠当前页数据量估算
  const total = data?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(FIRST_PAGE, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  const canPrev = page > FIRST_PAGE;
  const canNext = page < totalPages;

  return (
    <section>
      <h1 className="admin-page-header">用户</h1>

      {/* 搜索 + 每页条数 */}
      <div className="apple-card mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="search"
              className="w-full h-10 rounded-full border border-[var(--border)] bg-white pl-9 pr-4 text-[14px] text-[var(--text-h)] outline-none transition-[border-color] focus:border-[var(--text-h)]"
              placeholder="按邮箱搜索…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)]">
            <span>每页显示</span>
            <select
              className="h-9 rounded-full border border-[var(--border)] bg-white px-3 text-[14px] text-[var(--text-h)] outline-none focus:border-[var(--text-h)]"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span>条</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="apple-card py-16 text-center text-[14px] text-[var(--text-muted)]">
          加载中…
        </div>
      )}

      {error && (
        <div className="apple-card flex-col-center py-16 text-center">
          <div className="flex-center w-14 h-14 rounded-full bg-[rgba(239,68,68,0.08)] text-[var(--danger)] mb-4">
            <TriangleAlert size={24} />
          </div>
          <p className="text-[15px] font-medium text-[var(--text-h)]">加载失败</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">{error.message}</p>
        </div>
      )}

      {data && data.list.length > 0 && (
        <>
          <div className="apple-card p-0 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg)]">
                  <th className="admin-table-cell text-left text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em]">
                    ID
                  </th>
                  <th className="admin-table-cell text-left text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em]">
                    邮箱
                  </th>
                  <th className="admin-table-cell text-left text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em]">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.list.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-black/5 first:border-t-0 transition-colors duration-150 hover:bg-black/[0.02]"
                  >
                    <td className="admin-table-cell text-[var(--text-muted)]">{user.id}</td>
                    <td className="admin-table-cell font-medium text-[var(--text-h)]">
                      {user.email}
                    </td>
                    <td className="admin-table-cell">{user.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页：total 来自后端，canNext 基于真实总页数 */}
          <div className="flex items-center justify-between mt-4 text-[14px] text-[var(--text-muted)]">
            <div>
              共 {total} 条，第 {page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!canPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canNext}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </>
      )}

      {data && data.list.length === 0 && (
        <div className="apple-card flex-col-center py-20 text-center">
          <div className="flex-center w-14 h-14 rounded-full bg-[var(--bg)] text-[var(--text-muted)] mb-4">
            <Inbox size={24} />
          </div>
          <p className="text-[15px] font-medium text-[var(--text-h)]">暂无用户</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">注册的用户账号会显示在这里。</p>
        </div>
      )}
    </section>
  );
}
