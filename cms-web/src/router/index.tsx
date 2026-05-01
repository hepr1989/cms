import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import PortalLayout from '@/components/layout/PortalLayout';
import AdminPage from '@/pages/admin/AdminPage';
import PortalPage from '@/pages/portal/PortalPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/portal" replace />,
  },
  {
    path: '/portal',
    element: <PortalLayout />,
    children: [
      { index: true, element: <PortalPage /> },
      { path: 'folder/:folderCode', lazy: () => import('@/pages/portal/FolderBrowsePage').then(m => ({ Component: m.default })) },
      { path: 'article/:articleCode', lazy: () => import('@/pages/portal/ArticleReadPage').then(m => ({ Component: m.default })) },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminPage /> },
      { path: 'folder/:folderCode', lazy: () => import('@/pages/admin/FolderViewPage').then(m => ({ Component: m.default })) },
      { path: 'article/:articleCode', lazy: () => import('@/pages/admin/ArticleEditPage').then(m => ({ Component: m.default })) },
    ],
  },
]);
