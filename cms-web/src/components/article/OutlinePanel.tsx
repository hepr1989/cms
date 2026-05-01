import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

/** ============ 大纲数据 ============ */
export interface HeadingItem {
  level: number;
  text: string;
  index: number;
}

export function extractHeadings(markdown: string): HeadingItem[] {
  if (!markdown) return [];
  let idx = 0;
  return markdown.split('\n')
    .filter(line => /^#{1,6}\s+/.test(line))
    .map(line => {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (!match) return null;
      return { level: match[1].length, text: match[2].replace(/\*+/g, '').trim(), index: idx++ };
    })
    .filter(Boolean) as HeadingItem[];
}

/** 查找包含目标元素的最近可滚动祖先 */
function getScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/** ============ 大纲面板（参考图风格） ============ */
interface OutlinePanelProps {
  headings: HeadingItem[];
  /** 自定义点击回调 */
  onHeadingClick?: (index: number) => void;
  /** 面板模式：portal（前台阅读页）| editor（编辑器） */
  mode?: 'portal' | 'editor';
}

export function OutlinePanel({ headings, onHeadingClick, mode = 'portal' }: OutlinePanelProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const isManualScroll = useRef(false);

  // 滚动监听：追踪当前可见的标题
  useEffect(() => {
    if (headings.length === 0) return;

    const scrollContainer = mode === 'editor'
      ? document.querySelector('.w-md-editor-preview')
      : document.querySelector('.content-area');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isManualScroll.current) return;

      const headingEls = scrollContainer.querySelectorAll('[id^="heading-"]');
      if (headingEls.length === 0) return;

      const scrollTop = (scrollContainer as HTMLElement).scrollTop;
      const containerTop = (scrollContainer as HTMLElement).getBoundingClientRect().top;
      const offset = 80;

      let current = -1;
      headingEls.forEach((el) => {
        const elTop = (el as HTMLElement).getBoundingClientRect().top - containerTop + scrollTop;
        if (elTop <= scrollTop + offset) {
          const id = el.id.replace('heading-', '');
          current = parseInt(id, 10);
        }
      });
      setActiveIndex(current);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [mode, headings]);

  // 点击定位
  const handleClick = useCallback((index: number) => {
    setActiveIndex(index);
    isManualScroll.current = true;

    if (onHeadingClick) {
      onHeadingClick(index);
    } else {
      const el = document.getElementById(`heading-${index}`);
      if (el) {
        const scrollContainer = getScrollParent(el);
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const targetScrollTop = scrollContainer.scrollTop + (elRect.top - containerRect.top) - 60;
          scrollContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    setTimeout(() => { isManualScroll.current = false; }, 800);
  }, [onHeadingClick]);

  if (headings.length === 0) {
    return (
      <div className="outline-panel">
        <div className="outline-header">
          <span className="outline-header-text">大纲</span>
        </div>
        <div className="outline-body">
          <div className="outline-empty">暂无标题</div>
        </div>
      </div>
    );
  }

  return (
    <div className="outline-panel">
      <div className="outline-header">
        <span className="outline-header-text">大纲</span>
      </div>
      <div className="outline-body">
        {headings.map((h) => (
          <div
            key={h.index}
            className={`outline-item ${activeIndex === h.index ? 'outline-item-active' : ''}`}
            style={{ paddingLeft: (h.level - 1) * 16 + 12 }}
            onClick={() => handleClick(h.index)}
            title={h.text}
          >
            {activeIndex === h.index && <div className="outline-item-bar" />}
            <span className="outline-item-text">{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
