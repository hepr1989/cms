import { useTreeStore } from '@/store/tree-store';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import FolderTree from '@/components/tree/FolderTree';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const isAdmin = useAuthStore(s => s.isAdmin);
  const isOnAdminPage = location.pathname.startsWith('/admin');
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const openModal = useUIStore(s => s.openModal);
  const selectedKey = useTreeStore(s => s.selectedKey);

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        <FolderTree mode={isOnAdminPage ? 'admin' : 'portal'} />
      </div>
      {isOnAdminPage && isAdmin() && (
        <div className="sidebar-actions">
          <Button type="primary" icon={<PlusOutlined />} block
            onClick={() => openModal('folderCreate', { parentFolderCode: selectedKey ? selectedKey.replace('folder-', '') : '-1' })}>
            新增栏目
          </Button>
        </div>
      )}
    </div>
  );
}
