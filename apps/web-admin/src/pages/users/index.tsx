import { UsersTable } from './users-table';
import { useUsersList } from './use-users-list';

/**
 * 用户列表页：只做布局，数据全部来自 useUsersList。
 *
 * 视图状态（页码 / 每页条数 / 搜索词）都存在 URL 上 ——
 * 刷新、分享链接、浏览器前进后退都能还原同一份列表视图。
 */
export default function UsersPage() {
  const query = useUsersList();

  return (
    <section>
      <h1 className="admin-page-header">用户</h1>
      <UsersTable {...query} />
    </section>
  );
}
