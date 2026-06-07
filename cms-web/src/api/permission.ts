import client from './client';
import type { FolderPermissionVO } from '@/types/permission';

export const getUserPermissions = (username: string) =>
  client.get<FolderPermissionVO[]>('/folder-permissions', { params: { username } });

/** 查询当前登录用户自己的栏目权限 */
export const getMyPermissions = () =>
  client.get<FolderPermissionVO[]>('/folder-permissions/mine');

export const grantPermission = (data: { username: string; folderCode: string }) =>
  client.post('/folder-permissions/grant', data);

export const revokePermission = (data: { username: string; folderCode: string }) =>
  client.post('/folder-permissions/revoke', data);

export const batchUpdatePermissions = (data: {
  username: string;
  grantCodes: string[];
  revokeCodes: string[];
}) => client.post('/folder-permissions/batch', data);
