import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import PortalLayout from '@/components/layout/PortalLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminPage from '@/pages/admin/AdminPage';
import PortalPage from '@/pages/portal/PortalPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/portal" replace />,
  },
  {
    path: '/login',
    lazy: () => import('@/pages/auth/LoginPage').then(m => ({ Component: m.default })),
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
    element: <AuthGuard><AdminLayout /></AuthGuard>,
    children: [
      { index: true, element: <AdminPage /> },
      { path: 'folder/:folderCode', lazy: () => import('@/pages/admin/FolderViewPage').then(m => ({ Component: m.default })) },
      { path: 'article/:articleCode', lazy: () => import('@/pages/admin/ArticleEditPage').then(m => ({ Component: m.default })) },
      { path: 'users', lazy: () => import('@/pages/admin/UserManagePage').then(m => ({ Component: m.default })) },
      { path: 'permissions', lazy: () => import('@/pages/admin/PermissionConfigPage').then(m => ({ Component: m.default })) },
    ],
  },
]);
