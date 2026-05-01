import type { ArticleVO } from './article';

export interface FolderVO {
  folderCode: string;
  title: string;
  parentFolderCode: string;
  status: number;
  description: string;
  sort: number;
  childrenCount: number;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTreeVO {
  folders: FolderVO[];
  articles: ArticleVO[];
}

export interface FolderCreateDTO {
  title: string;
  parentFolderCode?: string;
  description?: string;
}

export interface FolderUpdateDTO {
  folderCode: string;
  title: string;
  description?: string;
  status: number;
}

export interface FolderSortDTO {
  movingCode: string;
  targetCode: string;
  position: 'BEFORE' | 'AFTER';
}
