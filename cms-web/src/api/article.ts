import client from './client';
import type { ArticleVO, ArticleCreateDTO, ArticleUpdateDTO, ArticleSortDTO, ArticleMoveDTO } from '@/types';

export const getArticle = (articleCode: string) => client.get<ArticleVO>(`/articles/${articleCode}`);

export const createArticle = (data: ArticleCreateDTO) => client.post<ArticleVO>('/articles', data);

export const updateArticle = (data: ArticleUpdateDTO) => client.put<ArticleVO>('/articles', data);

export const publishArticle = (articleCode: string) => client.put(`/articles/${articleCode}/publish`);

export const offlineArticle = (articleCode: string) => client.put(`/articles/${articleCode}/offline`);

export const deleteArticle = (articleCode: string) => client.delete(`/articles/${articleCode}`);

export const updateArticleSort = (data: ArticleSortDTO) => client.put('/articles/sort', data);

export const moveArticle = (data: ArticleMoveDTO) => client.put('/articles/move', data);

export const importPdf = (
  file: File,
  folderCode: string,
  onProgress?: (percent: number) => void,
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folderCode', folderCode);
  return client.post<ArticleVO>('/articles/import-pdf', formData, {
    onUploadProgress: onProgress
      ? (e) => {
          if (e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        }
      : undefined,
  });
};
