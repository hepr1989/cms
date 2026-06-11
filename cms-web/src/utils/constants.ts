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

/** 格式化日期时间，去掉 ISO 格式中的 T 和小数秒，将 2026-05-01T13:18:19.0050004 显示为 2026-05-01 13:18:19 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  // 截取到秒级（去掉小数秒），再将 T 替换为空格
  return value.replace(/(\d{2}:\d{2}:\d{2}).*/, '$1').replace('T', ' ');
}
