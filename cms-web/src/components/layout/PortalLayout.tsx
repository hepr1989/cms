import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import HeaderBar from './HeaderBar';
import Sidebar from './Sidebar';
import { useResponsive } from '@/hooks/use-responsive';
import { useUIStore } from '@/store/ui-store';

export default function PortalLayout() {
  useResponsive();
  const isMobile = useUIStore(s => s.isMobile);
  const collapsed = useUIStore(s => s.sidebarCollapsed);

  return (
    <div className="app-layout">
      <HeaderBar />
      <div className="app-body">
        {(!isMobile || !collapsed) && <Sidebar />}
        <main className="content-area">
          <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
