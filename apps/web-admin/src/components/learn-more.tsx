import { CircleQuestionMark } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button, Popover, PopoverContent, PopoverTrigger } from '@app/ui';

type LearnMoreProps = React.ComponentProps<typeof Popover> & {
  contentProps?: React.ComponentProps<typeof PopoverContent>;
  triggerProps?: React.ComponentProps<typeof PopoverTrigger>;
};

export function LearnMore({ children, contentProps, triggerProps, ...props }: LearnMoreProps) {
  return (
    <Popover {...props}>
      <PopoverTrigger
        asChild
        {...triggerProps}
        className={cn('size-5 rounded-full', triggerProps?.className)}
      >
        <Button variant="outline" size="icon">
          <span className="sr-only">了解更多</span>
          <CircleQuestionMark className="size-4 [&>circle]:hidden" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        {...contentProps}
        className={cn('text-sm text-muted-foreground', contentProps?.className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
