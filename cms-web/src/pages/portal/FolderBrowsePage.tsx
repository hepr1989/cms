import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderOutlined, FileTextOutlined } from '@ant-design/icons';
import { getChildren } from '@/api/folder';
import { useTreeStore } from '@/store/tree-store';
import MetadataBar from '@/components/common/MetadataBar';
import type { FolderVO, ArticleVO, FolderTreeVO } from '@/types';

export default function FolderBrowsePage() {
  const { folderCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<FolderTreeVO | null>(null);
  const syncSelection = useTreeStore(s => s.syncSelection);

  useEffect(() => {
    if (folderCode) {
      getChildren(folderCode, true).then(d => setData(d as any));
      syncSelection(`folder-${folderCode}`);
    }
  }, [folderCode, syncSelection]);

  if (!data) return <div>加载中...</div>;

  return (
    <div className="folder-browse-page">
      {data.folders.length > 0 && (
        <div className="browse-section">
          <div className="browse-section-title">栏目</div>
          <div className="browse-card-grid browse-card-grid--folder">
            {data.folders.map((f: FolderVO) => (
              <div
                key={f.folderCode}
                className="browse-card browse-card--folder"
                onClick={() => navigate(`/portal/folder/${f.folderCode}`)}
              >
                <FolderOutlined className="browse-card-icon browse-card-icon--folder" />
                <span className="browse-card-text">{f.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.articles.length > 0 && (
        <div className="browse-section">
          <div className="browse-section-title">文章</div>
          <div className="browse-card-grid browse-card-grid--article">
            {data.articles.map((a: ArticleVO) => (
              <div
                key={a.articleCode}
                className="browse-card browse-card--article"
                onClick={() => navigate(`/portal/article/${a.articleCode}`)}
              >
                <FileTextOutlined className="browse-card-icon browse-card-icon--article" />
                <span className="browse-card-text">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <MetadataBar updatedAt={null} showShare={false} />
    </div>
  );
}
