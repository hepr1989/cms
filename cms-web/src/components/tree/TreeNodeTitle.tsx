import React from 'react';
import { FolderOutlined, FileTextOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Modal, message } from 'antd';
import type { TreeDataNode } from '@/types';
import { useUIStore } from '@/store/ui-store';
import { useTreeStore } from '@/store/tree-store';
import { deleteFolder } from '@/api/folder';
import { deleteArticle } from '@/api/article';
import { ArticleStatus } from '@/types';

interface Props {
  node: TreeDataNode;
  mode: 'admin' | 'portal';
}

const TreeNodeTitle = React.memo(function TreeNodeTitle({ node, mode }: Props) {
  const openModal = useUIStore(s => s.openModal);
  const removeNode = useTreeStore(s => s.removeNode);

  const handleDelete = async () => {
    const typeName = node.type === 'folder' ? '栏目' : '文章';
    Modal.confirm({
      title: `确认删除${typeName}`,
      content: '删除后不可恢复',
      onOk: async () => {
        try {
          if (node.type === 'folder') {
            await deleteFolder(node.code);
          } else {
            await deleteArticle(node.code);
          }
          removeNode(node.key);
          message.success('已删除');
        } catch (e: any) {
          message.error(e?.response?.data?.message || e?.message || '删除失败');
        }
      },
    });
  };

  const statusColor = node.type === 'article'
    ? node.status === ArticleStatus.PUBLISHED ? 'var(--color-success)'
      : node.status === ArticleStatus.OFFLINE ? 'var(--color-error)' : 'var(--color-warning)'
    : undefined;

  return (
    <div className="tree-node-title" style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
      {node.type === 'folder' ? <FolderOutlined style={{ color: 'var(--color-primary)' }} /> : <FileTextOutlined style={{ color: statusColor || 'var(--color-text-secondary)' }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
      {mode === 'admin' && (
        <span className="tree-node-actions" style={{ display: 'none' }}>
          {node.type === 'folder' && (
            <>
              <Button type="text" size="small" icon={<FolderOutlined />} onClick={e => { e.stopPropagation(); openModal('folderCreate', { parentFolderCode: node.code }); }} />
              <Button type="text" size="small" icon={<EditOutlined />} onClick={e => { e.stopPropagation(); openModal('folderEdit', { folderCode: node.code }); }} />
            </>
          )}
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={e => { e.stopPropagation(); handleDelete(); }} />
        </span>
      )}
    </div>
  );
}, (prev, next) =>
  prev.node.key === next.node.key &&
  prev.node.title === next.node.title &&
  prev.node.status === next.node.status &&
  prev.mode === next.mode
);

export default TreeNodeTitle;
