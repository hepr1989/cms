import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { useArticleStore } from '@/store/article-store';
import { useTreeStore } from '@/store/tree-store';
import MarkdownRenderer from '@/components/article/MarkdownRenderer';
import MetadataBar from '@/components/common/MetadataBar';
import { extractHeadings, OutlinePanel } from '@/components/article/OutlinePanel';

export default function ArticleReadPage() {
  const { articleCode } = useParams();
  const article = useArticleStore(s => s.currentArticle);
  const loadArticle = useArticleStore(s => s.loadArticle);
  const reset = useArticleStore(s => s.reset);
  const syncSelection = useTreeStore(s => s.syncSelection);
  const [showOutline, setShowOutline] = useState(true);

  useEffect(() => {
    if (articleCode) {
      // 先加载文章获取 folderCode，再展开树路径
      loadArticle(articleCode).then(() => {
        const fc = useArticleStore.getState().currentArticle?.folderCode;
        syncSelection(`article-${articleCode}`, fc);
      });
    }
    return () => reset();
  }, [articleCode, loadArticle, reset, syncSelection]);

  const headings = useMemo(
    () => extractHeadings(article?.contentMd || ''),
    [article?.contentMd]
  );

  const hasOutline = headings.length > 0;

  if (!article) return <div>加载中...</div>;

  return (
    <div className="article-read-page">
      <div className="article-read-content">
        <div className="article-read-header">
          <h1>{article.title}</h1>
        </div>
        <MarkdownRenderer content={article.contentMd || ''} />
        <MetadataBar updatedAt={article.updatedAt} updatedBy={article.updatedBy} />
      </div>
      {hasOutline && (
        <>
          <Button
            className="outline-toggle-btn"
            type={showOutline ? 'primary' : 'default'}
            icon={<UnorderedListOutlined />}
            onClick={() => setShowOutline(v => !v)}
            title={showOutline ? '收起大纲' : '展开大纲'}
            size="small"
            style={{ right: showOutline ? 268 : 16 }}
          />
          {showOutline && <OutlinePanel headings={headings} mode="portal" />}
        </>
      )}
    </div>
  );
}
