import '@tanstack/react-table';

/**
 * TanStack Table 的列级扩展类型声明。
 *
 * ColumnDef 的 `meta` 默认是空接口，在列定义里写 `meta: { className: '...' }`
 * 会直接报错。这里用 declaration merging 补上项目用到的字段，
 * 让列定义里的 meta 有类型提示（而不是 `any`）。
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** 作用于该列表头/单元格的额外类名（宽度、对齐、粘性等） */
    className?: string;
  }
}

export {};
