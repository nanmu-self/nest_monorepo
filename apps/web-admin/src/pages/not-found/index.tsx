import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="center-block">
      <h1>404</h1>
      <p>页面不存在。</p>
      <Link to="/">回到首页</Link>
    </section>
  );
}
