import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { Inbox, TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@app/ui';

import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import { usersColumns } from './columns';
import type { UsersListQuery } from './use-users-list';

type UsersTableProps = UsersListQuery;

/**
 * 用户列表表格（纯展示）。
 *
 * 服务端分页的关键一行是 `manualPagination: true` + `pageCount` ——
 * 没有它，`table.getPageCount()` 会拿当前页 10 行去算页数，
 * 分页控件会永远显示「第 1 / 1 页」。传进后端算出的 pageCount 后，
 * 首/末页禁用态、页码序列、总条数才全部正确。
 *
 * 数据请求在 useUsersList 里，本组件只管渲染。
 */
export function UsersTable({
  rows,
  total,
  pageCount,
  pagination,
  onPaginationChange,
  search,
  setSearch,
  appliedSearch,
  loading,
  error,
}: UsersTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: rows,
    columns: usersColumns,
    state: { pagination, columnVisibility },
    pageCount,
    manualPagination: true,
    // 排序/筛选都在后端，浏览器里不再做一遍
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: false,
    onPaginationChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (error) {
    return (
      <div className="apple-card flex-col-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] text-[var(--danger)]">
          <TriangleAlert size={24} />
        </div>
        <p className="text-[15px] font-medium text-[var(--text-h)]">加载失败</p>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">{error.message}</p>
      </div>
    );
  }

  const visibleColumnCount = table.getVisibleLeafColumns().length;

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="按邮箱搜索…"
        resetText="重置"
      />

      {/* 圆角裁切交给容器，表格自身不出圆角，避免最后一行的边框在圆角处露出来 */}
      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows columnCount={visibleColumnCount} />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleColumnCount} className="h-52">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--text-muted)]">
                      <Inbox size={24} />
                    </div>
                    <p className="text-[15px] font-medium text-[var(--text-h)]">
                      {appliedSearch ? '没有匹配的邮箱' : '暂无用户'}
                    </p>
                    <p className="text-[13px] text-[var(--text-muted)]">
                      {appliedSearch
                        ? '换个关键词试试，或点「重置」清空搜索条件。'
                        : '注册的用户账号会显示在这里。'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} total={total} className="mt-auto" />
    </div>
  );
}

/**
 * 加载占位：按真实列数渲染，且不参与 hover。
 * 这样加载完成时表头与行宽不会跳动，也不会在骨架屏上出现可点击的错觉。
 */
function SkeletonRows({ columnCount, rows = 5 }: { columnCount: number; rows?: number }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <TableRow key={rowIndex} className="hover:bg-transparent">
      {Array.from({ length: columnCount }, (_, colIndex) => (
        <TableCell key={colIndex}>
          <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
