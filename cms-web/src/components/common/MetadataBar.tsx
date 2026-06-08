import { Button } from 'antd';
import { ShareAltOutlined, PlusOutlined } from '@ant-design/icons';
import { formatDateTime } from '@/utils/constants';

interface Props {
  updatedAt: string | null;
  updatedBy?: string | null;
  showShare?: boolean;
  showAdd?: boolean;
  onAddFolder?: () => void;
  onAddArticle?: () => void;
}

export default function MetadataBar({ updatedAt, updatedBy, showShare = false, showAdd = false, onAddFolder, onAddArticle }: Props) {
  return (
    <div className="metadata-bar">
      <span className="meta-time">
        最近修改: {formatDateTime(updatedAt) || '-'}
        {updatedBy && <span style={{ marginLeft: 12 }}>修改人: {updatedBy}</span>}
      </span>
      <div className="meta-actions">
        {showAdd && (
          <>
            <Button size="small" onClick={onAddFolder}>新增栏目</Button>
            <Button size="small" onClick={onAddArticle}>新增文章</Button>
          </>
        )}
        {showShare && <Button size="small" icon={<ShareAltOutlined />}>分享文章</Button>}
      </div>
    </div>
  );
}
