import { X } from 'lucide-react';
import { type Table } from '@tanstack/react-table';
import { Button, Input } from '@app/ui';

import { DataTableFacetedFilter } from './faceted-filter';
import { DataTableViewOptions } from './view-options';

/** 一个分面筛选项的声明 */
export type FacetedFilterConfig = {
  /** 对应的列 id */
  columnId: string;
  /** 触发器上显示的文字 */
  title: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
};

type DataTableToolbarProps<TData> = {
  table: Table<TData>;
  /** 搜索框受控值：来自 `useTableUrlState` 的 `globalFilter` */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FacetedFilterConfig[];
  /** 列 id -> 显示名，透传给列显隐菜单 */
  columnLabels: Record<string, string>;
  /** 重置按钮的文案 */
  resetText?: string;
};

/**
 * 列表工具栏：搜索框 + 分面筛选 + 列显隐。
 *
 * 与上游的两点差异：
 * 1. 搜索框是**受控组件**，值由 `useTableUrlState` 提供。本项目列表是服务端分页，
 *    搜索也走后端（`manualFiltering`），所以搜索状态不能挂在 table 实例上。
 * 2. 「重置」会同时清空搜索框与列筛选 —— 否则 URL 上会残留搜索词，
 *    而输入框已被清空，两者对不上。
 */
export function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  searchPlaceholder = '筛选…',
  filters = [],
  columnLabels,
  resetText = '重置',
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || Boolean(searchValue);

  const reset = () => {
    onSearchChange?.('');
    table.resetColumnFilters();
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:gap-2">
        {onSearchChange && (
          <Input
            type="search"
            aria-label="搜索"
            placeholder={searchPlaceholder}
            value={searchValue ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-8 w-full sm:w-60"
          />
        )}
        <div className="flex gap-x-2">
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) return null;
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            );
          })}
        </div>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={reset} className="px-2 lg:px-3">
            {resetText}
            <X className="ms-2 size-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} labels={columnLabels} />
    </div>
  );
}
