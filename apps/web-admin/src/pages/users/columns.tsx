import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@app/ui';
import type { UserDTO } from '@app/shared';

import { DataTableColumnHeader } from '@/components/data-table';
import { LongText } from '@/components/long-text';

/**
 * 用户列表的列定义。
 *
 * 服务端分页下，排序/筛选都交给后端，所以这里的 `header` 只负责渲染控件，
 * 真正的 `onSortingChange` 走 table -> URL -> useWatcher -> 后端。
 * `enableSorting: false` 的列不给排序按钮，因为后端没实现对应排序。
 */
export const usersColumns: ColumnDef<UserDTO>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => (
      <span className="font-mono text-[13px] text-muted-foreground">{row.original.id}</span>
    ),
    meta: { className: 'w-20' },
    enableSorting: false,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="邮箱" />,
    cell: ({ row }) => <LongText className="max-w-72">{row.original.email}</LongText>,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="注册时间" />,
    cell: ({ row }) => (
      <time dateTime={row.original.created_at} className="text-muted-foreground">
        {formatDateTime(row.original.created_at)}
      </time>
    ),
    meta: { className: 'w-44' },
    enableSorting: false,
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="最后更新" />,
    cell: ({ row }) => (
      <time dateTime={row.original.updated_at} className="text-muted-foreground">
        {formatDateTime(row.original.updated_at)}
      </time>
    ),
    meta: { className: 'w-44' },
    enableSorting: false,
  },
  {
    id: 'source',
    header: '来源',
    cell: () => <Badge variant="secondary">邮箱注册</Badge>,
    meta: { className: 'w-28' },
    enableSorting: false,
  },
];

/**
 * 后端时间字段是 ISO string，前端按浏览器本地时区渲染。
 * 手写而不是引 dayjs/date-fns：只有「格式化」这一个需求，
 * 不值得为它加一个运行时依赖。
 */
function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
