import { Link2, Plus } from 'lucide-react';

/**
 * 短链管理页。列表 / 创建 / 编辑功能待后端接口就绪后接入，
 * 当前先给出完整的页面骨架与空状态。
 */
export default function ShortLinksPage() {
  return (
    <section>
      <div className="flex-between mb-6">
        <h1 className="admin-page-header mb-0">短链</h1>
        <button type="button" className="btn-primary" disabled title="接口接入后开放">
          <Plus size={16} />
          创建短链
        </button>
      </div>

      {/* 空状态：Apple 式留白，图标 + 一句话说明 + 引导操作 */}
      <div className="apple-card flex-col-center py-20 text-center">
        <div className="flex-center w-14 h-14 rounded-full bg-[#f5f5f7] text-[#86868b] mb-4">
          <Link2 size={24} />
        </div>
        <p className="text-[15px] font-medium text-[#1d1d1f]">还没有短链</p>
        <p className="text-[13px] text-[#86868b] mt-1 max-w-xs leading-relaxed">
          创建你的第一个短链接，之后可以在这里查看访问量与管理状态。
        </p>
      </div>
    </section>
  );
}
