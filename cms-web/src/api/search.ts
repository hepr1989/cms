import client from './client';
import type { SearchResultVO } from '@/types';

export const searchArticles = (keyword: string, portalMode = true) =>
  client.get<SearchResultVO[]>('/search', { params: { keyword, portalMode } });
