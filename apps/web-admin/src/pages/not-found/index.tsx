import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="center-block">
      <h1>404</h1>
      <p>页面不存在。</p>
      {/* btn-primary 来自 config-unocss 的 shortcut，验证 UnoCSS 端到端工作 */}
      <Link to="/" className="btn-primary">
        {/* i-lucide-* 来自 @iconify-json/lucide，presetIcons 自动按需生成 */}
        <span className="i-lucide-arrow-left" />
        回到首页
      </Link>
    </section>
  );
}
