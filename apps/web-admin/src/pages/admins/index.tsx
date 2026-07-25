import { useRequest } from 'alova/client';
import { Inbox, TriangleAlert } from 'lucide-react';

import { getUsers } from '@/api/users';

export default function AdminsPage() {
  // data 自动推断为 UserDTO[] | undefined（alova 从 Method 泛型推导）
  const { data, loading, error } = useRequest(getUsers);

  return (
    <section>
      <h1 className="admin-page-header">管理员</h1>

      {loading && (
        <div className="apple-card py-16 text-center text-[14px] text-[#86868b]">加载中…</div>
      )}

      {error && (
        <div className="apple-card flex-col-center py-16 text-center">
          <div className="flex-center w-14 h-14 rounded-full bg-[#fff2f1] text-[#ff3b30] mb-4">
            <TriangleAlert size={24} />
          </div>
          <p className="text-[15px] font-medium text-[#1d1d1f]">加载失败</p>
          <p className="text-[13px] text-[#86868b] mt-1">{error.message}</p>
        </div>
      )}

      {data && data.length > 0 && (
        /* 表格放进卡片：表头浅灰分层，行间细分隔线，末行不留线 */
        <div className="apple-card p-0 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f5f5f7]">
                <th className="admin-table-cell text-left text-[12px] font-medium text-[#86868b] uppercase tracking-[0.04em]">
                  ID
                </th>
                <th className="admin-table-cell text-left text-[12px] font-medium text-[#86868b] uppercase tracking-[0.04em]">
                  邮箱
                </th>
                <th className="admin-table-cell text-left text-[12px] font-medium text-[#86868b] uppercase tracking-[0.04em]">
                  创建时间
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-[#f0f0f2] first:border-t-0 transition-colors duration-150 hover:bg-[#fafafa]"
                >
                  <td className="admin-table-cell text-[#86868b]">{user.id}</td>
                  <td className="admin-table-cell font-medium text-[#1d1d1f]">{user.email}</td>
                  <td className="admin-table-cell">{user.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.length === 0 && (
        <div className="apple-card flex-col-center py-20 text-center">
          <div className="flex-center w-14 h-14 rounded-full bg-[#f5f5f7] text-[#86868b] mb-4">
            <Inbox size={24} />
          </div>
          <p className="text-[15px] font-medium text-[#1d1d1f]">暂无管理员</p>
          <p className="text-[13px] text-[#86868b] mt-1">添加的管理员账号会显示在这里。</p>
        </div>
      )}
    </section>
  );
}
