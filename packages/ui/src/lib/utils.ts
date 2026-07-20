import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind 类名：clsx 处理条件类，twMerge 解决冲突
 * 用法：cn('px-2', condition && 'px-4', 'text-red-500') -> 'px-4 text-red-500'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
