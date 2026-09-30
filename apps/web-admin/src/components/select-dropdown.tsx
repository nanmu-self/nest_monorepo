import { Loader } from 'lucide-react';
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@app/ui';

type SelectDropdownProps = {
  onValueChange?: (value: string) => void;
  defaultValue: string | undefined;
  placeholder?: string;
  isPending?: boolean;
  items: { label: string; value: string }[] | undefined;
  disabled?: boolean;
  className?: string;
  /** true 时受控（传 value/onValueChange），false 时非受控（传 defaultValue） */
  isControlled?: boolean;
};

/**
 * 带 loading 占位态的下拉选择器。
 *
 * `isControlled` 存在的意义：表单库里「当前有值就用受控、没值就用非受控」很常见，
 * 而 Radix 的 Root 不允许同时传两者，所以在调用点显式声明走哪条路。
 */
export function SelectDropdown({
  defaultValue,
  onValueChange,
  isPending,
  items,
  placeholder,
  disabled,
  className = '',
  isControlled = false,
}: SelectDropdownProps) {
  const stateProps = isControlled
    ? { value: defaultValue, onValueChange }
    : { defaultValue, onValueChange };

  return (
    <Select {...stateProps}>
      <SelectTrigger disabled={disabled} className={cn(className)}>
        <SelectValue placeholder={placeholder ?? '请选择'} />
      </SelectTrigger>
      <SelectContent>
        {isPending ? (
          <SelectItem disabled value="__loading__" className="h-14">
            <div className="flex items-center justify-center gap-2">
              <Loader className="size-5 animate-spin" />
              加载中…
            </div>
          </SelectItem>
        ) : (
          items?.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
