import client from './client';
import type { ArticleVersionVO } from '@/types/version';

export const getVersions = (articleCode: string) =>
  client.get<ArticleVersionVO[]>(`/articles/${articleCode}/versions`);

export const getVersionDetail = (articleCode: string, versionNumber: number) =>
  client.get<ArticleVersionVO>(`/articles/${articleCode}/versions/${versionNumber}`);
