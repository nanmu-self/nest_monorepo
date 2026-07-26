import * as React from 'react';

import { cn } from '../../lib/utils';

/**
 * 语义化标签。
 *
 * shadcn 官方基于 radix-ui 的 Label 原语实现，此处为保持 UI 包依赖精简，
 * 使用原生 <label>，仅保留同款样式与 group/peer 禁用态。
 */
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
