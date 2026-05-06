import React, { useMemo, useRef } from 'react';
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, List, Typography, message, Progress } from 'antd';
import { FolderOutlined, FileTextOutlined, ArrowLeftOutlined, EditOutlined, FolderAddOutlined, FileAddOutlined, ImportOutlined } from '@ant-design/icons';
import { useTreeStore } from '@/store/tree-store';
import { useUIStore } from '@/store/ui-store';
import { getChildren } from '@/api/folder';
import { importPdf } from '@/api/article';
import ArticleStatusBadge from '@/components/article/ArticleStatusBadge';
import type { FolderVO, ArticleVO, FolderTreeVO, TreeDataNode } from '@/types';

function findNode(nodes: TreeDataNode[], key: string): TreeDataNode | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNode(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

export default function FolderViewPage() {
  const { folderCode } = useParams();
  const navigate = useNavigate();
  const openModal = useUIStore(s => s.openModal);
  const treeData = useTreeStore(s => s.treeData);
  const syncSelection = useTreeStore(s => s.syncSelection);
  const addArticleNode = useTreeStore(s => s.addArticleNode);
  const [data, setData] = React.useState<FolderTreeVO | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importFileName, setImportFileName] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 是否为最外层目录（父级是根目录则不显示返回按钮）
  const isTopLevel = useMemo(() => {
    if (!folderCode) return true;
    const folderKey = `folder-${folderCode}`;
    const node = findNode(treeData, folderKey);
    return !node?.parentKey || node.parentKey === '-1';
  }, [folderCode, treeData]);

  // 查找父目录名称
  const parentFolderTitle = useMemo(() => {
    if (isTopLevel) return null;
    if (!folderCode) return null;
    const folderKey = `folder-${folderCode}`;
    const node = findNode(treeData, folderKey);
    if (node?.parentKey) {
      return findNode(treeData, node.parentKey)?.title ?? null;
    }
    return null;
  }, [folderCode, treeData, isTopLevel]);

  const refreshData = () => {
    if (folderCode) {
      getChildren(folderCode, false).then(d => setData(d as any));
    }
  };

  useEffect(() => {
    if (folderCode) {
      getChildren(folderCode, false).then(d => setData(d as any));
      syncSelection(`folder-${folderCode}`);
    }
  }, [folderCode]);

  const handleImportPdf = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !folderCode) return;

    // 校验文件类型
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
      message.error('请选择 PDF 文件');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportFileName(file.name);

    try {
      const res = await importPdf(file, folderCode, (percent) => {
        setImportProgress(percent);
      });
      const article = (res as any).data || res;
      message.success('PDF 导入成功');

      // 更新侧栏树
      addArticleNode(`folder-${folderCode}`, article as ArticleVO);

      // 刷新目录数据
      refreshData();

      // 跳转到编辑页
      navigate(`/admin/article/${(article as ArticleVO).articleCode}`);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'PDF 导入失败';
      message.error(errMsg);
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportFileName('');
      // 重置 input 以便再次选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!data) return <div>加载中...</div>;

  const hasContent = data.folders.length > 0 || data.articles.length > 0;

  return (
    <div className="folder-view-page">
      <div className="folder-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isTopLevel && <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>{parentFolderTitle || '返回'}</Button>}
          <Typography.Title level={3} style={{ margin: 0 }}>{hasContent ? '栏目内容' : '空栏目'}</Typography.Title>
        </div>
        <div className="folder-view-actions">
          <Button type="primary" ghost icon={<EditOutlined />} onClick={() => openModal('folderEdit', { folderCode })}>编辑栏目</Button>
          <Button
            type="primary"
            ghost
            icon={<FolderAddOutlined />}
            onClick={() => openModal('folderCreate', { parentFolderCode: folderCode })}
          >
            新增栏目
          </Button>
          <Button
            type="primary"
            icon={<FileAddOutlined />}
            onClick={() => navigate(`/admin/article/new?folderCode=${folderCode}`)}
          >
            新增文章
          </Button>
          <Button
            type="primary"
            ghost
            icon={<ImportOutlined />}
            loading={importing}
            onClick={handleImportPdf}
          >
            导入PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {importing && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 1000,
        }}>
          <FileTextOutlined style={{ fontSize: 16, color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {importFileName}
          </span>
          <Progress percent={importProgress} size="small" style={{ flex: 1, maxWidth: 300 }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', minWidth: 40 }}>{importProgress}%</span>
        </div>
      )}

      {data.folders.length > 0 && (
        <List
          header={<span style={{ fontWeight: 600, fontSize: 14 }}>栏目</span>}
          dataSource={data.folders}
          renderItem={(f: FolderVO) => (
            <List.Item extra={
              <div style={{ display: 'flex', gap: 4 }}>
                <Button type="link" onClick={() => openModal('folderEdit', { folderCode: f.folderCode })}>编辑</Button>
                <Button type="link" onClick={() => navigate(`/admin/folder/${f.folderCode}`)}>查看</Button>
              </div>
            }>
              <List.Item.Meta avatar={<FolderOutlined style={{ fontSize: 20, color: 'var(--color-primary)' }} />} title={f.title} description={f.description} />
            </List.Item>
          )}
        />
      )}

      {data.articles.length > 0 && (
        <List
          header={<span style={{ fontWeight: 600, fontSize: 14 }}>文章</span>}
          dataSource={data.articles}
          renderItem={(a: ArticleVO) => (
            <List.Item extra={<><ArticleStatusBadge status={a.status} /><Button type="link" onClick={() => navigate(`/admin/article/${a.articleCode}`)}>编辑</Button></>}>
              <List.Item.Meta avatar={<FileTextOutlined style={{ fontSize: 20 }} />} title={a.title} />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
