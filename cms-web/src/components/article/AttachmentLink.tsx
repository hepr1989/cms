import React, { useState, useEffect } from 'react';
import { getAttachment } from '@/api/attachment';
import type { AttachmentVO } from '@/types';

/** 附件元数据缓存，避免同一附件重复请求 */
const attachmentCache = new Map<string, AttachmentVO>();

/** 下载图标 SVG */
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
  </svg>
);

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** 从下载 API URL 中提取 attachmentCode */
const DOWNLOAD_URL_RE = /\/api\/attachments\/([^/]+)\/download/;

interface AttachmentLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  node?: any;
}

/**
 * 自定义 react-markdown 的 a 组件渲染。
 * - /api/attachments/{code}/download → 获取元数据，显示文件名+大小
 * - /uploads/ → 旧格式，保持原有行为
 */
const AttachmentLink = React.forwardRef<HTMLAnchorElement, AttachmentLinkProps>(
  function AttachmentLink({ href, children, ...rest }, _ref) {
    const downloadMatch = typeof href === 'string' ? href.match(DOWNLOAD_URL_RE) : null;
    const isLegacyAttachment = !downloadMatch && typeof href === 'string' && href.startsWith('/uploads/');

    const attachmentCode = downloadMatch ? downloadMatch[1] : null;
    const [meta, setMeta] = useState<AttachmentVO | null>(
      attachmentCode ? attachmentCache.get(attachmentCode) ?? null : null
    );

    useEffect(() => {
      if (!attachmentCode) return;
      if (attachmentCache.has(attachmentCode)) {
        setMeta(attachmentCache.get(attachmentCode)!);
        return;
      }
      getAttachment(attachmentCode)
        .then((res: any) => {
          const data = res?.data ?? res;
          if (data) {
            attachmentCache.set(attachmentCode, data);
            setMeta(data);
          }
        })
        .catch(() => { /* 静默处理 */ });
    }, [attachmentCode]);

    if (downloadMatch) {
      const displayName = meta?.fileName ?? (typeof children === 'string' ? children : '附件');
      const sizeText = meta?.fileSize ? ` (${formatFileSize(meta.fileSize)})` : '';
      return (
        <a
          href={href}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="attachment-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--color-primary, #1677ff)',
            textDecoration: 'underline',
            fontWeight: 500,
            padding: '2px 0',
            borderRadius: '2px',
          }}
          {...rest}
        >
          <FileIcon />
          {displayName}{sizeText}
        </a>
      );
    }

    if (isLegacyAttachment) {
      return (
        <a
          href={href}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="attachment-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--color-primary, #1677ff)',
            textDecoration: 'underline',
            fontWeight: 500,
            padding: '2px 0',
            borderRadius: '2px',
          }}
          {...rest}
        >
          <FileIcon />
          {children}
        </a>
      );
    }

    return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
  }
);

export default AttachmentLink;
