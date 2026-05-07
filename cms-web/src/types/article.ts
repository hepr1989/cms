export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OFFLINE = 'OFFLINE',
}

export interface ArticleVO {
  articleCode: string;
  title: string;
  contentMd: string | null;
  folderCode: string;
  status: ArticleStatus;
  publishedAt: string | null;
  sort: number;
  folderTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleCreateDTO {
  title: string;
  contentMd?: string;
  folderCode: string;
}

export interface ArticleUpdateDTO {
  articleCode: string;
  title: string;
  contentMd?: string;
  folderCode: string;
}

export interface ArticleSortDTO {
  movingCode: string;
  targetCode: string;
  position: 'BEFORE' | 'AFTER';
}

export interface ArticleMoveDTO {
  articleCode: string;
  targetFolderCode: string;
  targetCode?: string;
  position?: 'BEFORE' | 'AFTER';
}
