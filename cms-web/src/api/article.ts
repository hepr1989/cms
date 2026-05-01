import client from './client';
import type { ArticleVO, ArticleCreateDTO, ArticleUpdateDTO, ArticleSortDTO } from '@/types';

export const getArticle = (articleCode: string) => client.get<ArticleVO>(`/articles/${articleCode}`);

export const createArticle = (data: ArticleCreateDTO) => client.post<ArticleVO>('/articles', data);

export const updateArticle = (data: ArticleUpdateDTO) => client.put<ArticleVO>('/articles', data);

export const publishArticle = (articleCode: string) => client.put(`/articles/${articleCode}/publish`);

export const offlineArticle = (articleCode: string) => client.put(`/articles/${articleCode}/offline`);

export const deleteArticle = (articleCode: string) => client.delete(`/articles/${articleCode}`);

export const updateArticleSort = (data: ArticleSortDTO) => client.put('/articles/sort', data);
