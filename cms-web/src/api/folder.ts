import client from './client';
import type { FolderVO, FolderTreeVO, FolderCreateDTO, FolderUpdateDTO, FolderSortDTO, FolderMoveDTO } from '@/types';

export const getRootFolders = (portalMode = false) =>
  client.get<FolderVO[]>('/folders/root', { params: { portalMode } });

export const getChildren = (folderCode: string, portalMode = false) =>
  client.get<FolderTreeVO>(`/folders/${folderCode}/children`, { params: { portalMode } });

export const getFolder = (folderCode: string) => client.get<FolderVO>(`/folders/${folderCode}`);

export const createFolder = (data: FolderCreateDTO) => client.post<FolderVO>('/folders', data);

export const updateFolder = (data: FolderUpdateDTO) => client.put<FolderVO>('/folders', data);

export const deleteFolder = (folderCode: string) => client.delete(`/folders/${folderCode}`);

export const updateFolderSort = (data: FolderSortDTO) => client.put('/folders/sort', data);

export const moveFolder = (data: FolderMoveDTO) => client.put('/folders/move', data);
