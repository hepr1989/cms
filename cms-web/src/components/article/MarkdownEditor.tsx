import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import MDEditor, { getCommands, getExtraCommands, commands as mdCommands } from '@uiw/react-md-editor';
import type { ICommand } from '@uiw/react-md-editor';
import { useArticleStore } from '@/store/article-store';
import { useUIStore } from '@/store/ui-store';
import { uploadFile } from '@/api/attachment';
import { extractHeadings, OutlinePanel } from '@/components/article/OutlinePanel';
import AttachmentLink from '@/components/article/AttachmentLink';

/** ============ SVG 图标 (与内置命令 12x12 风格一致) ============ */

const AlignCenterIcon = () => (
  <svg role="img" width="12" height="12" viewBox="0 0 512 512" fill="currentColor">
    <path d="M464 24H48C34.7 24 24 34.7 24 48s10.7 24 24 24h416c13.3 0 24-10.7 24-24s-10.7-24-24-24zM304 136H208c-13.3 0-24 10.7-24 24s10.7 24 24 24h96c13.3 0 24-10.7 24-24s-10.7-24-24-24zm160 112H48c-13.3 0-24 10.7-24 24s10.7 24 24 24h416c13.3 0 24-10.7 24-24s-10.7-24-24-24zM304 328H208c-13.3 0-24 10.7-24 24s10.7 24 24 24h96c13.3 0 24-10.7 24-24s-10.7-24-24-24zM464 432H48C34.7 432 24 421.3 24 408s10.7-24 24-24h416c13.3 0 24 10.7 24 24s-10.7 24-24 24z" />
  </svg>
);

const UnderlineIcon = () => (
  <svg data-name="underline" width="12" height="12" role="img" viewBox="0 0 448 512">
    <path
      fill="currentColor"
      d="M224 384c88.4 0 160-71.6 160-160V32c0-17.7-14.3-32-32-32s-32 14.3-32 32v192c0 53-43 96-96 96s-96-43-96-96V32c0-17.7-14.3-32-32-32S64 14.3 64 32v192c0 88.4 71.6 160 160 160zM0 464c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32z"
    />
  </svg>
);

const HighlightIcon = () => (
  <svg data-name="highlight" width="12" height="12" role="img" viewBox="0 0 576 512">
    <path
      fill="currentColor"
      d="M558.2 162.6c12.5-12.5 12.5-32.8 0-45.3l-67.3-67.3c-12.5-12.5-32.8-12.5-45.3 0L352 143.6l-67.3-67.3c-12.5-12.5-32.8-12.5-45.3 0l-67.3 67.3c-12.5 12.5-12.5 32.8 0 45.3l67.3 67.3L58.7 436.9C21.7 473.9 0 524.1 0 576h576c0-51.9-21.7-102.1-58.7-139.1L336.6 256.2l221.6-93.6zM243.9 364.1l147-147 45.3 45.3-147 147c-12.3 12.3-27.9 21-45.2 25.5l-50.7 12.7 12.7-50.7c4.5-17.3 13.2-32.9 25.5-45.2z"
    />
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
export default function MarkdownEditor({ readOnly = false, value }: { readOnly?: boolean; value?: string } = {}) {
  const article = useArticleStore(s => s.currentArticle);
  const setContent = useArticleStore(s => s.setContent);
  const isMobile = useUIStore(s => s.isMobile);
  const [showOutline, setShowOutline] = useState(false);
  const toggleOutline = useCallback(() => setShowOutline(v => !v), []);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // 追踪光标所在位置的格式状态（用于工具栏按钮高亮）
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);

  // 外部传入 value 时优先使用（历史版本预览场景）
  const contentMd = value !== undefined ? value : (article?.contentMd || '');

  const headings = useMemo(
    () => extractHeadings(contentMd),
    [contentMd]
  );

  // 监听光标位置，检测是否在 <u>/<mark>/<center> 标签内
  useEffect(() => {
    if (readOnly) return;
    const updateActiveFormats = () => {
      const ta = editorRef.current?.querySelector('textarea');
      if (!ta) return;
      const { value: text, selectionStart } = ta;
      const before = text.slice(0, selectionStart);
      const active = new Set<string>();
      if ((before.lastIndexOf('<u>') > before.lastIndexOf('</u>'))) active.add('underline');
      if ((before.lastIndexOf('<mark>') > before.lastIndexOf('</mark>'))) active.add('highlight');
      if ((before.lastIndexOf('<center>') > before.lastIndexOf('</center>'))) active.add('center');
      setActiveFormats(prev => {
        if (prev.size === active.size && [...active].every(v => prev.has(v))) return prev;
        return active;
      });
    };
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [readOnly]);

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

  // 自定义按钮渲染：支持格式高亮
  const renderFmtBtn = useCallback(
    (fmtKey: string) => (cmd: ICommand, disabled: boolean, execCmd: (c: ICommand) => void, idx: number) => {
      const isActive = activeFormats.has(fmtKey);
      return (
        <button
          type="button"
          disabled={disabled}
          data-name={cmd.name}
          {...cmd.buttonProps}
          style={isActive
            ? { ...((cmd.buttonProps as any)?.style || {}), color: 'var(--color-accent-fg)', backgroundColor: 'var(--color-neutral-muted)' }
            : (cmd.buttonProps as any)?.style}
          onClick={(e) => { e.stopPropagation(); execCmd(cmd); }}
        >
          {cmd.icon}
        </button>
      );
    },
    [activeFormats],
  );

  const commands = useMemo(() => {
    const builtIn = applyZhTitles(getCommands());
    const filtered = builtIn.filter(cmd => cmd.name !== 'image' && cmd.name !== 'help');
    // 将下划线和高亮插入到 strikethrough 后面，与粗体/斜体/删除线同组
    const strikeIdx = filtered.findIndex(c => c.name === 'strikethrough');
    const insertAt = strikeIdx >= 0 ? strikeIdx + 1 : filtered.length;

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

    // 通用 HTML 标签包裹/解包裹执行函数，支持三种情况：
    // 1. 选区包含标签：<u>text</u> → 解包裹
    // 2. 选区在标签内部（光标选中了内部文本）→ 检测外围标签并解包裹
    // 3. 无标签 → 包裹
    const execTagToggle = (state: any, api: any, open: string, close: string) => {
      const text = state.selectedText || '';
      const sel = state.selection;
      // 情况1：选区本身包含完整标签
      const re = new RegExp(`^${open.replace(/[<>]/g, c => '\\' + c)}([\\s\\S]*)${close.replace(/[<>]/g, c => '\\' + c)}$`);
      const match = text.match(re);
      if (match) {
        api.replaceSelection(match[1]);
        api.setSelectionRange({ start: sel.start, end: sel.end - open.length - close.length });
        return;
      }
      // 情况2：选区在标签内部（上次操作后重新选中的内部文本）
      const fullText = state.text || '';
      const textBefore = fullText.slice(0, sel.start);
      const textAfter = fullText.slice(sel.end);
      if (textBefore.endsWith(open) && textAfter.startsWith(close)) {
        api.setSelectionRange({ start: sel.start - open.length, end: sel.end + close.length });
        api.replaceSelection(text);
        api.setSelectionRange({ start: sel.start - open.length, end: sel.end - open.length });
        return;
      }
      // 情况3：无标签，包裹
      api.replaceSelection(`${open}${text}${close}`);
      api.setSelectionRange({ start: sel.start + open.length, end: sel.end + open.length });
    };

    const alignCenterCmd: ICommand = {
      name: 'align-center',
      keyCommand: 'align-center',
      shortcuts: 'ctrlcmd+shift+e',
      icon: <AlignCenterIcon />,
      buttonProps: { title: '居中对齐', 'aria-label': '居中对齐' },
      render: renderFmtBtn('center'),
      execute: (state: any, api: any) => execTagToggle(state, api, '<center>', '</center>'),
    };

    const underlineCmd: ICommand = {
      name: 'underline',
      keyCommand: 'underline',
      shortcuts: 'ctrlcmd+u',
      icon: <UnderlineIcon />,
      buttonProps: { title: '下划线 (Ctrl+U)', 'aria-label': '下划线 (Ctrl+U)' },
      render: renderFmtBtn('underline'),
      execute: (state: any, api: any) => execTagToggle(state, api, '<u>', '</u>'),
    };

    const highlightCmd: ICommand = {
      name: 'highlight',
      keyCommand: 'highlight',
      shortcuts: 'ctrlcmd+shift+h',
      icon: <HighlightIcon />,
      buttonProps: { title: '高亮 (Ctrl+Shift+H)', 'aria-label': '高亮 (Ctrl+Shift+H)' },
      render: renderFmtBtn('highlight'),
      execute: (state: any, api: any) => execTagToggle(state, api, '<mark>', '</mark>'),
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
      ...filtered.slice(0, insertAt),
      underlineCmd,
      highlightCmd,
      ...filtered.slice(insertAt),
      mdCommands.divider,
      imageUploadCmd,
      attachmentUploadCmd,
      alignCenterCmd,
      mdCommands.divider,
      outlineCmd,
    ];
  }, [showOutline, toggleOutline, handleImageUpload, handleAttachmentUpload, renderFmtBtn]);

  const extraCommands = useMemo(() => {
    const builtInExtra = applyZhTitles(getExtraCommands());
    return builtInExtra.filter(cmd => cmd.name !== 'fullscreen');
  }, []);

  // 用 MutationObserver 持续为 MDEditor 预览区标题添加 ID
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
    const content = contentMd;
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
  }, [contentMd]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div data-color-mode="light" style={{ flex: 1, minHeight: 0 }} ref={editorRef}>
        <MDEditor
          value={contentMd}
          onChange={val => !readOnly && value === undefined && setContent(val || '')}
          preview={readOnly ? 'preview' : (isMobile ? 'edit' : 'live')}
          height="100%"
          visibleDragbar={false}
          commands={readOnly ? [] : commands}
          extraCommands={readOnly ? [] : extraCommands}
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
