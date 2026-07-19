import { useRequest } from 'alova/client';

import { getUsers } from '@/api/users';

export default function AdminsPage() {
  // data 自动推断为 UserDTO[] | undefined（alova 从 Method 泛型推导）
  const { data, loading, error } = useRequest(getUsers);

  return (
    <section>
      <h1>用户管理</h1>

      {loading && <p>加载中...</p>}

      {error && <p style={{ color: 'red' }}>加载失败：{error.message}</p>}

      {data && data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>邮箱</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.length === 0 && <p>暂无用户</p>}
    </section>
  );
}
