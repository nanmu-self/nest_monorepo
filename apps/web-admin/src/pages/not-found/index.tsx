import { Compass } from 'lucide-react';

import { ErrorView } from '@/components/error-view';

/** 404：路由未匹配到任何页面 */
export default function NotFoundPage() {
  return (
    <ErrorView
      code={404}
      icon={Compass}
      title="页面走丢了"
      description="你访问的页面不存在或已被移动，请检查地址或返回继续操作。"
    />
  );
}
