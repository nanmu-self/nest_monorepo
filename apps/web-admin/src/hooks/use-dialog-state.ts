import { useState } from 'react';

/**
 * 弹窗开关状态 hook：用「当前开的是哪个弹窗」代替一堆 boolean。
 *
 * `setOpen` 带 toggle 语义：传入当前已打开的值就关掉它，
 * 再次点击同一个触发按钮可以直接关闭，不需要调用方自己先判断。
 * 打开另一个弹窗时会自动替换掉原来的，所以天然互斥。
 *
 * @param initialState 初始打开的弹窗 key，默认都不打开
 * @returns `[当前打开的 key, 打开/关闭函数]`
 *
 * @example
 * const [open, setOpen] = useDialogState<'edit' | 'delete'>();
 * // 打开编辑弹窗：setOpen('edit')
 * // 再点一次编辑按钮：setOpen('edit') —— 自动关闭
 * // 打开删除弹窗：setOpen('delete') —— 编辑弹窗自动关掉
 */
export default function useDialogState<T extends string | boolean>(initialState: T | null = null) {
  const [open, setOpenState] = useState<T | null>(initialState);

  const setOpen = (key: T | null) => setOpenState((prev) => (prev === key ? null : key));

  return [open, setOpen] as const;
}
