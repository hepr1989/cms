import { create } from 'zustand';
import type { ArticleVO } from '@/types';
import { ArticleStatus } from '@/types';
import * as articleApi from '@/api/article';

interface ArticleState {
  currentArticle: ArticleVO | null;
  isDirty: boolean;
  isSaving: boolean;
  originalContent: string;

  initNewArticle: (folderCode: string) => void;
  loadArticle: (articleCode: string) => Promise<void>;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  saveArticle: () => Promise<ArticleVO>;
  publishArticle: () => Promise<void>;
  offlineArticle: () => Promise<void>;
  reset: () => void;
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  currentArticle: null,
  isDirty: false,
  isSaving: false,
  originalContent: '',

  initNewArticle: (folderCode: string) => set({
    currentArticle: {
      articleCode: '',
      title: '',
      contentMd: '',
      folderCode,
      status: ArticleStatus.DRAFT,
      publishedAt: null,
      sort: 0,
      createdAt: '',
      updatedAt: '',
    },
    isDirty: false,
    originalContent: '',
  }),

  loadArticle: async (articleCode: string) => {
    const article = await articleApi.getArticle(articleCode) as unknown as ArticleVO;
    set({
      currentArticle: article,
      isDirty: false,
      originalContent: article.contentMd || '',
    });
  },

  setContent: (content: string) => {
    if (!get().currentArticle) return;
    set(state => ({
      currentArticle: { ...state.currentArticle!, contentMd: content },
      isDirty: content !== get().originalContent,
    }));
  },

  setTitle: (title: string) => {
    if (!get().currentArticle) return;
    set(state => ({
      currentArticle: { ...state.currentArticle!, title },
      isDirty: true,
    }));
  },

  saveArticle: async () => {
    const { currentArticle } = get();
    if (!currentArticle) throw new Error('没有正在编辑的文章');
    set({ isSaving: true });
    try {
      let result: ArticleVO;
      if (!currentArticle.articleCode) {
        // 新建文章 - 调用 createArticle (POST)，后端用雪花算法生成 articleCode
        result = await articleApi.createArticle({
          title: currentArticle.title,
          contentMd: currentArticle.contentMd || '',
          folderCode: currentArticle.folderCode,
        }) as unknown as ArticleVO;
      } else {
        // 编辑文章 - 调用 updateArticle (PUT)
        result = await articleApi.updateArticle({
          articleCode: currentArticle.articleCode,
          title: currentArticle.title,
          contentMd: currentArticle.contentMd || '',
          folderCode: currentArticle.folderCode,
        }) as unknown as ArticleVO;
      }
      set({
        currentArticle: result,
        isDirty: false,
        originalContent: result.contentMd || '',
      });
      return result;
    } finally {
      set({ isSaving: false });
    }
  },

  publishArticle: async () => {
    const { currentArticle } = get();
    if (!currentArticle) return;
    // 如果文章未保存（新建）或有未保存的修改，先保存再发布
    let code = currentArticle.articleCode;
    if (!code || get().isDirty) {
      const saved = await get().saveArticle();
      code = saved.articleCode;
    }
    await articleApi.publishArticle(code);
    await get().loadArticle(code);
  },

  offlineArticle: async () => {
    const { currentArticle } = get();
    if (!currentArticle) return;
    await articleApi.offlineArticle(currentArticle.articleCode);
    await get().loadArticle(currentArticle.articleCode);
  },

  reset: () => set({ currentArticle: null, isDirty: false, isSaving: false, originalContent: '' }),
}));
