import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import MDEditor, { getCommands, getExtraCommands, commands as mdCommands } from '@uiw/react-md-editor';
import type { ICommand } from '@uiw/react-md-editor';
import { useArticleStore } from '@/store/article-store';
import { useUIStore } from '@/store/ui-store';
import { uploadFile } from '@/api/attachment';
import { extractHeadings, OutlinePanel } from '@/components/article/OutlinePanel';
import AttachmentLink from '@/components/article/AttachmentLink';

/** ============ SVG 图标 (与内置命令 12x12 风格一致) ============ */

const AlignLeftIcon = () => (
  <svg role="img" width="12" height="12" viewBox="0 0 512 512" fill="currentColor">
    <path d="M48 72h416c13.3 0 24-10.7 24-24S477.3 24 464 24H48C34.7 24 24 34.7 24 48s10.7 24 24 24zm0 160h256c13.3 0 24-10.7 24-24s-10.7-24-24-24H48c-13.3 0-24 10.7-24 24s10.7 24 24 24zm416 112H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h416c13.3 0 24-10.7 24-24s-10.7-24-24-24zM304 408H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h256c13.3 0 24-10.7 24-24s-10.7-24-24-24z" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg role="img" width="12" height="12" viewBox="0 0 512 512" fill="currentColor">
    <path d="M464 24H48C34.7 24 24 34.7 24 48s10.7 24 24 24h416c13.3 0 24-10.7 24-24s-10.7-24-24-24zM304 136H208c-13.3 0-24 10.7-24 24s10.7 24 24 24h96c13.3 0 24-10.7 24-24s-10.7-24-24-24zm160 112H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h416c13.3 0 24-10.7 24-24s-10.7-24-24-24zM304 328H208c-13.3 0-24 10.7-24 24s10.7 24 24 24h96c13.3 0 24-10.7 24-24s-10.7-24-24-24zM464 432H48C34.7 432 24 421.3 24 408s10.7-24 24-24h416c13.3 0 24 10.7 24 24s-10.7 24-24 24z" />
  </svg>
);

const AlignRightIcon = () => (
  <svg role="img" width="12" height="12" viewBox="0 0 512 512" fill="currentColor">
    <path d="M464 72H48C34.7 72 24 61.3 24 48s10.7-24 24-24h416c13.3 0 24 10.7 24 24s-10.7 24-24 24zM208 232H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h160c13.3 0 24-10.7 24-24s-10.7-24-24-24zm256 112H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h416c13.3 0 24-10.7 24-24s-10.7-24-24-24zM208 408H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h160c13.3 0 24-10.7 24-24s-10.7-24-24-24z" />
  </svg>
);

const OutlineIcon = () => (
  <svg role="img" width="12" height="12" viewBox="0 0 512 512" fill="currentColor">
    <path d="M48 88h416c13.3 0 24-10.7 24-24s-10.7-24-24-24H48C34.7 40 24 50.7 24 64s10.7 24 24 24zm0 128h224c13.3 0 24-10.7 24-24s-10.7-24-24-24H48c-13.3 0-24 10.7-24 24s10.7 24 24 24zm416 80H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h416c13.3 0 24-10.7 24-24s-10.7-24-24-24zm-192 80H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h224c13.3 0 24-10.7 24-24s-10.7-24-24-24z" />
  </svg>
);

const UploadIcon = () => (
  <svg role="img" width="12" height="12" viewBox="0 0 512 512" fill="currentColor">
    <path d="M448 384H352c-17.7 0-32 14.3-32 32v32H192v-32c0-17.7-14.3-32-32-32H64V64h384v320zm32 0V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V384zM264 224v80c0 13.3-10.7 24-24 24s-24-10.7-24-24v-80H152c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V96c0-13.3 10.7-24 24-24s24 10.7 24 24v80h64c13.3 0 24 10.7 24 24s-10.7 24-24 24h-64z" />
  </svg>
);

const PaperclipIcon = () => (
  <svg role="img" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);

/** ============ 中文工具栏 ============ */
const zhTitles: Record<string, string> = {
  bold: '粗体 (Ctrl+B)',
  italic: '斜体 (Ctrl+I)',
  strikethrough: '删除线 (Ctrl+Shift+X)',
  hr: '分割线 (Ctrl+H)',
  title: '标题',
  link: '链接 (Ctrl+L)',
  quote: '引用 (Ctrl+Q)',
  code: '行内代码 (Ctrl+J)',
  codeBlock: '代码块 (Ctrl+Shift+J)',
  comment: '注释 (Ctrl+/)',
  image: '图片 (Ctrl+K)',
  table: '表格',
  'unordered-list': '无序列表 (Ctrl+Shift+U)',
  'ordered-list': '有序列表 (Ctrl+Shift+O)',
  'checked-list': '任务列表 (Ctrl+Shift+C)',
  edit: '编辑模式 (Ctrl+7)',
  live: '实时预览 (Ctrl+8)',
  preview: '预览模式 (Ctrl+9)',
  fullscreen: '全屏 (Ctrl+0)',
  'attachment-upload': '上传附件',
};

function applyZhTitles(cmds: ICommand[]): ICommand[] {
  return cmds.map(cmd => {
    const zhTitle = zhTitles[cmd.name || ''];
    if (zhTitle) {
      return { ...cmd, buttonProps: { ...cmd.buttonProps, title: zhTitle, 'aria-label': zhTitle } };
    }
    return cmd;
  });
}

/** ============ 上传进度状态 ============ */
interface UploadProgress {
  fileName: string;
  percent: number;
}

/**
 * 将 markdown 插入到当前内容末尾。
 * 通过 Zustand store 的 getState() 获取最新内容，避免 React 重新渲染导致的 api 引用失效问题。
 */
function insertMarkdownToContent(md: string) {
  const store = useArticleStore.getState();
  const current = store.currentArticle?.contentMd || '';
  store.setContent(current + '\n' + md + '\n');
}

/** ============ 主组件 ============ */
export default function MarkdownEditor() {
  const article = useArticleStore(s => s.currentArticle);
  const setContent = useArticleStore(s => s.setContent);
  const isMobile = useUIStore(s => s.isMobile);
  const [showOutline, setShowOutline] = useState(false);
  const toggleOutline = useCallback(() => setShowOutline(v => !v), []);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const headings = useMemo(
    () => extractHeadings(article?.contentMd || ''),
    [article?.contentMd]
  );

  /** 通用图片上传（按钮上传 + 粘贴共用） */
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      setUploadProgress({ fileName: file.name, percent: 0 });
      const result = await uploadFile(file, 'article', article?.articleCode || '', (percent) => {
        setUploadProgress({ fileName: file.name, percent });
      }) as any;
      const md = `![${file.name}](${result.fileUrl})`;
      insertMarkdownToContent(md);
    } catch {
      // 上传失败静默处理
    } finally {
      setUploadProgress(null);
    }
  }, [article?.articleCode]);

  /** 通用附件上传 */
  const handleAttachmentUpload = useCallback(async (file: File) => {
    try {
      setUploadProgress({ fileName: file.name, percent: 0 });
      const result = await uploadFile(file, 'article', article?.articleCode || '', (percent) => {
        setUploadProgress({ fileName: file.name, percent });
      }) as any;
      const md = `[${file.name}](${result.downloadUrl})`;
      insertMarkdownToContent(md);
    } catch {
      // 上传失败静默处理
    } finally {
      setUploadProgress(null);
    }
  }, [article?.articleCode]);

  const commands = useMemo(() => {
    const builtIn = applyZhTitles(getCommands());
    const filtered = builtIn.filter(cmd => cmd.name !== 'image' && cmd.name !== 'help');

    const imageUploadCmd: ICommand = {
      name: 'image-upload',
      keyCommand: 'image-upload',
      icon: <UploadIcon />,
      buttonProps: { title: '上传图片', 'aria-label': '上传图片' },
      execute: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          await handleImageUpload(file);
        };
        input.click();
      },
    };

    const attachmentUploadCmd: ICommand = {
      name: 'attachment-upload',
      keyCommand: 'attachment-upload',
      icon: <PaperclipIcon />,
      buttonProps: { title: '上传附件', 'aria-label': '上传附件' },
      execute: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.zip,.md,.ppt,.pptx,.txt,.csv';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          await handleAttachmentUpload(file);
        };
        input.click();
      },
    };

    const alignLeftCmd: ICommand = {
      name: 'align-left',
      keyCommand: 'align-left',
      shortcuts: 'ctrlcmd+shift+l',
      icon: <AlignLeftIcon />,
      buttonProps: { title: '居左对齐', 'aria-label': '居左对齐' },
      execute: (state: any, api: any) => {
        const text = state.selectedText || '';
        api.replaceSelection(`<div style="text-align: left">\n\n${text}\n\n</div>\n`);
      },
    };

    const alignCenterCmd: ICommand = {
      name: 'align-center',
      keyCommand: 'align-center',
      shortcuts: 'ctrlcmd+shift+e',
      icon: <AlignCenterIcon />,
      buttonProps: { title: '居中对齐', 'aria-label': '居中对齐' },
      execute: (state: any, api: any) => {
        const text = state.selectedText || '';
        api.replaceSelection(`<div style="text-align: center">\n\n${text}\n\n</div>\n`);
      },
    };

    const alignRightCmd: ICommand = {
      name: 'align-right',
      keyCommand: 'align-right',
      shortcuts: 'ctrlcmd+shift+r',
      icon: <AlignRightIcon />,
      buttonProps: { title: '居右对齐', 'aria-label': '居右对齐' },
      execute: (state: any, api: any) => {
        const text = state.selectedText || '';
        api.replaceSelection(`<div style="text-align: right">\n\n${text}\n\n</div>\n`);
      },
    };

    const outlineCmd: ICommand = {
      name: 'outline',
      keyCommand: 'outline',
      icon: <OutlineIcon />,
      buttonProps: {
        title: '文章大纲',
        'aria-label': '文章大纲',
        style: showOutline ? { color: 'var(--color-primary)', background: 'var(--color-bg-selected)' } : undefined,
      },
      execute: () => toggleOutline(),
    };

    return [
      ...filtered,
      mdCommands.divider,
      imageUploadCmd,
      attachmentUploadCmd,
      alignLeftCmd,
      alignCenterCmd,
      alignRightCmd,
      mdCommands.divider,
      outlineCmd,
    ];
  }, [showOutline, toggleOutline, handleImageUpload, handleAttachmentUpload]);

  const extraCommands = useMemo(() => {
    const builtInExtra = applyZhTitles(getExtraCommands());
    return builtInExtra.filter(cmd => cmd.name !== 'fullscreen');
  }, []);

  // 用 MutationObserver 持续为 MDEditor 预览区标题添加 ID
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const assignHeadingIds = () => {
      const preview = el.querySelector('.w-md-editor-preview');
      if (!preview) return;
      const headings = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((h, idx) => {
        if (h.id !== `heading-${idx}`) {
          h.id = `heading-${idx}`;
          (h as HTMLElement).style.scrollMarginTop = '60px';
        }
      });
    };

    assignHeadingIds();

    const observer = new MutationObserver(() => {
      assignHeadingIds();
    });
    observer.observe(el, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  // Ctrl+V 粘贴图片支持
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          await handleImageUpload(file);
          return;
        }
      }
    };

    const textarea = el.querySelector('textarea');
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => textarea.removeEventListener('paste', handlePaste);
    }

    // textarea 还没挂载，等待
    const observer = new MutationObserver(() => {
      const ta = el.querySelector('textarea');
      if (ta) {
        ta.addEventListener('paste', handlePaste);
        observer.disconnect();
      }
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [handleImageUpload]);

  // 大纲点击处理
  const handleOutlineClick = useCallback((index: number) => {
    const el = editorRef.current;
    if (!el) return;

    const preview = el.querySelector('.w-md-editor-preview') as HTMLElement | null;

    if (preview) {
      const heading = preview.querySelector(`#heading-${index}`) as HTMLElement | null;
      if (heading) {
        const containerRect = preview.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const targetTop = preview.scrollTop + (headingRect.top - containerRect.top) - 60;
        preview.scrollTo({ top: targetTop, behavior: 'smooth' });
        return;
      }
    }

    const textarea = el.querySelector('textarea');
    const content = article?.contentMd || '';
    if (!textarea || !content) return;

    const lines = content.split('\n');
    let headingIdx = 0;
    let charPos = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^#{1,6}\s+/.test(lines[i])) {
        if (headingIdx === index) {
          const ta = textarea as HTMLTextAreaElement;
          ta.focus();
          ta.setSelectionRange(charPos, charPos);
          const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24;
          ta.scrollTop = i * lineHeight - 40;
          return;
        }
        headingIdx++;
      }
      charPos += lines[i].length + 1;
    }
  }, [article?.contentMd]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div data-color-mode="light" style={{ flex: 1, minHeight: 0 }} ref={editorRef}>
        <MDEditor
          value={article?.contentMd || ''}
          onChange={val => setContent(val || '')}
          preview={isMobile ? 'edit' : 'live'}
          height="100%"
          visibleDragbar={false}
          commands={commands}
          extraCommands={extraCommands}
          previewOptions={{ components: { a: AttachmentLink } }}
        />
      </div>
      {showOutline && !isMobile && <OutlinePanel headings={headings} mode="editor" onHeadingClick={handleOutlineClick} />}

      {/* 上传进度条覆盖层 */}
      {uploadProgress && (
        <div style={{
          position: 'fixed',
          bottom: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-bg-elevated, #fff)',
          border: '1px solid var(--color-border, #e5e7eb)',
          borderRadius: 8,
          padding: '12px 20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          minWidth: 280,
        }}>
          <div style={{ fontSize: 13, marginBottom: 6, color: 'var(--color-text-primary)' }}>
            正在上传: {uploadProgress.fileName}
          </div>
          <div style={{
            width: '100%',
            height: 6,
            background: 'var(--color-bg-hover, #f0f0f0)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${uploadProgress.percent}%`,
              height: '100%',
              background: 'var(--color-primary, #1677ff)',
              borderRadius: 3,
              transition: 'width 0.2s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, textAlign: 'right' }}>
            {uploadProgress.percent}%
          </div>
        </div>
      )}
    </div>
  );
}
