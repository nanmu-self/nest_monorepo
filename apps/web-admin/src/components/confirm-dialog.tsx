import { cn } from '@/lib/utils';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@app/ui';

type ConfirmDialogProps = {
  /** 弹窗是否打开 */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 标题：一句话说明在确认什么 */
  title: React.ReactNode;
  /** 正文：说清后果，危险操作尤其需要 */
  desc: React.JSX.Element | string;
  disabled?: boolean;
  cancelBtnText?: string;
  confirmText?: React.ReactNode;
  /** 危险操作用破坏性样式（红色） */
  destructive?: boolean;
  /** 提交中：禁用两个按钮，防止重复提交 */
  isLoading?: boolean;
  className?: string;
  /** 额外内容，如「输入名称以确认删除」 */
  children?: React.ReactNode;
} & ({ form: string; handleConfirm?: undefined } | { form?: undefined; handleConfirm: () => void });

/**
 * 确认弹窗（AlertDialog 封装）。
 *
 * 与 Dialog 的区别：AlertDialog 不允许点遮罩关闭、不显示右上角关闭按钮 ——
 * 这是刻意的，它专用于「容易误触」的确认场景（删除、注销等）。
 * 普通表单弹窗请用 Dialog。
 */

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    title,
    desc,
    children,
    className,
    confirmText,
    cancelBtnText,
    destructive,
    isLoading,
    disabled = false,
    form,
    handleConfirm,
    ...actions
  } = props;
  return (
    <AlertDialog {...actions}>
      <AlertDialogContent className={cn(className)}>
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{desc}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelBtnText ?? '取消'}</AlertDialogCancel>
          <Button
            type={form ? 'submit' : 'button'}
            form={form}
            onClick={handleConfirm}
            variant={destructive ? 'destructive' : 'default'}
            disabled={disabled || isLoading}
          >
            {confirmText ?? '确定'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
