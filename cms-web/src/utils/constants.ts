export const ROOT_PARENT_KEY = '-1';

export const POSITION = {
  BEFORE: 'BEFORE',
  AFTER: 'AFTER',
} as const;

export const ARTICLE_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'warning', label: '草稿' },
  PUBLISHED: { color: 'success', label: '已发布' },
  OFFLINE: { color: 'default', label: '已下线' },
};

export const DEBOUNCE_DELAY = 300;

/** 格式化日期时间，去掉 ISO 格式中的 T，将 2026-05-01T13:18:19 显示为 2026-05-01 13:18:19 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  return value.replace('T', ' ');
}
