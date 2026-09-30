import { Telescope } from 'lucide-react';

export function ComingSoon() {
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <Telescope size={72} />
        <h1 className="text-4xl leading-tight font-bold">敬请期待</h1>
        <p className="text-center text-muted-foreground">该页面还在建设中。</p>
      </div>
    </div>
  );
}
