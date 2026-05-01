import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import AttachmentLink from '@/components/article/AttachmentLink';

interface Props {
  content: string;
}

const MarkdownRenderer = React.memo(function MarkdownRenderer({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 渲染后为所有标题添加 ID（比 components 覆盖更可靠）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((el, idx) => {
      el.id = `heading-${idx}`;
      (el as HTMLElement).style.scrollMarginTop = '60px';
    });
  }, [content]);

  return (
    <div className="markdown-body" ref={containerRef}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ a: AttachmentLink }}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
