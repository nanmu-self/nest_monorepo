import { Columns3 } from 'lucide-react';
import { type Table } from '@tanstack/react-table';

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/ui';

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>;
  /**
   * 列 id -> 显示名的映射。**必须提供**：默认回落到 column.id，
   * 而 column.id 是 `created_at` 这类内部字段名，直接暴露给用户不合适。
   */
  labels: Record<string, string>;
};

/** 列显隐菜单。 */
export function DataTableViewOptions<TData>({ table, labels }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ms-auto hidden h-8 lg:flex">
          <Columns3 className="size-4" />
          列设置
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-37.5">
        <DropdownMenuLabel>显示列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          // accessorFn 为空的是操作列（没有数据字段），不可隐藏
          .filter((column) => column.accessorFn !== undefined && column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {labels[column.id] ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
