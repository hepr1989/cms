export default function AdminPage() {
  return (
    <div className="empty-page">
      <svg className="empty-page-icon" viewBox="0 0 120 120" fill="none">
        <rect x="25" y="15" width="50" height="70" rx="4" stroke="currentColor" strokeWidth="2.5" opacity="0.15" />
        <rect x="35" y="25" width="50" height="70" rx="4" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
        <rect x="45" y="10" width="50" height="70" rx="4" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
        <line x1="55" y1="30" x2="85" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <line x1="55" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
        <line x1="55" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <line x1="55" y1="60" x2="75" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
        <circle cx="30" cy="90" r="16" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <line x1="42" y1="102" x2="52" y2="112" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.2" />
      </svg>
      <div className="empty-page-title">选择或创建内容</div>
      <div className="empty-page-desc">从左侧目录树选择栏目或文章进行管理</div>
    </div>
  );
}
