import { Tag } from 'antd';
import { ARTICLE_STATUS_CONFIG } from '@/utils/constants';
import { ArticleStatus } from '@/types';

interface Props {
  status: string;
}

export default function ArticleStatusBadge({ status }: Props) {
  const config = ARTICLE_STATUS_CONFIG[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
