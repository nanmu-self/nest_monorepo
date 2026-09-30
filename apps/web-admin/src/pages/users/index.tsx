import { useMemo, useState } from 'react';
import { useRequest } from 'alova/client';
import { Inbox, Search, TriangleAlert } from 'lucide-react';

import { getUsers } from '@/api/users';

const DEFAULT_PAGE_SIZE = 10;

/** 页码起始（后端约定从 1 开始） */
const FIRST_PAGE = 1;

/** 可用每页条数选项 */
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function UsersPage() {
  const [page, setPage] = useState(FIRST_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');

  const { data, loading, error, send } = useRequest(
    () => getUsers({ page, pageSize, search: search || undefined }),
    {
      immediate: true,
    },
  );

  const totalPages = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return FIRST_PAGE;
    // 当前接口仅返回当前页数据，没有 total。这里按 data 长度估算页数。
    // 若后续后端改成返回分页元信息，再替换为真实 total。
    return Math.max(FIRST_PAGE, Math.ceil(data.length / pageSize));
  }, [data, pageSize]);

  const canPrev = page > FIRST_PAGE;
  const canNext = page < totalPages;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(FIRST_PAGE);
    // 搜索词变化后手动触发请求，避免 useRequest 依赖数组过于复杂
    void send();
  };

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(FIRST_PAGE);
    void send();
  };

  return (
    <section>
      <h1 className="admin-page-header">用户</h1>

      {/* 搜索 + 每页条数 */}
      <div className="apple-card mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]"
            />
            <input
              type="search"
              className="w-full h-10 rounded-full border border-[#d2d2d7] bg-white pl-9 pr-4 text-[14px] text-[#1d1d1f] outline-none transition-[border-color] focus:border-[#1d1d1f]"
              placeholder="按邮箱搜索…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-[14px] text-[#86868b]">
            <span>每页显示</span>
            <select
              className="h-9 rounded-full border border-[#d2d2d7] bg-white px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-[#1d1d1f]"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
        <div className="apple-card py-16 text-center text-[14px] text-[#86868b]">加载中…</div>
      )}

      {error && (
        <div className="apple-card flex-col-center py-16 text-center">
          <div className="flex-center w-14 h-14 rounded-full bg-[#fff2f1] text-[#ff3b30] mb-4">
            <TriangleAlert size={24} />
          </div>
          <p className="text-[15px] font-medium text-[#1d1d1f]">加载失败</p>
          <p className="text-[13px] text-[#86868b] mt-1">{error.message}</p>
        </div>
      )}

      {Array.isArray(data) && data.length > 0 && (
        <>
          <div className="apple-card p-0 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f5f5f7]">
                  <th className="admin-table-cell text-left text-[12px] font-medium text-[#86868b] uppercase tracking-[0.04em]">
                    ID
                  </th>
                  <th className="admin-table-cell text-left text-[12px] font-medium text-[#86868b] uppercase tracking-[0.04em]">
                    邮箱
                  </th>
                  <th className="admin-table-cell text-left text-[12px] font-medium text-[#86868b] uppercase tracking-[0.04em]">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[#f0f0f2] first:border-t-0 transition-colors duration-150 hover:bg-[#fafafa]"
                  >
                    <td className="admin-table-cell text-[#86868b]">{user.id}</td>
                    <td className="admin-table-cell font-medium text-[#1d1d1f]">{user.email}</td>
                    <td className="admin-table-cell">{user.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between mt-4 text-[14px] text-[#86868b]">
            <div>
              第 {page} / {totalPages} 页，每页 {pageSize} 条
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={!canPrev}
                onClick={() => {
                  setPage((p) => p - 1);
                  void send();
                }}
              >
                上一页
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={!canNext}
                onClick={() => {
                  setPage((p) => p + 1);
                  void send();
                }}
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}

      {Array.isArray(data) && data.length === 0 && (
        <div className="apple-card flex-col-center py-20 text-center">
          <div className="flex-center w-14 h-14 rounded-full bg-[#f5f5f7] text-[#86868b] mb-4">
            <Inbox size={24} />
          </div>
          <p className="text-[15px] font-medium text-[#1d1d1f]">暂无用户</p>
          <p className="text-[13px] text-[#86868b] mt-1">注册的用户账号会显示在这里。</p>
        </div>
      )}
    </section>
  );
}
