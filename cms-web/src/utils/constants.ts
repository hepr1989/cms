export const ROOT_PARENT_KEY = '-1';

export const POSITION = {
  BEFORE: 'BEFORE',
  AFTER: 'AFTER',
} as const;

export const ARTICLE_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'warning', label: '草稿' },
  PUBLISHED: { color: 'success', label: '已发布' },
  OFFLINE: { color: 'error', label: '已下线' },
};

export const DEBOUNCE_DELAY = 300;
