import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Dropdown, message, Modal } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, DownOutlined } from '@ant-design/icons';
import { useArticleStore } from '@/store/article-store';
import { useTreeStore } from '@/store/tree-store';
import ArticleStatusBadge from '@/components/article/ArticleStatusBadge';
import MarkdownEditor from '@/components/article/MarkdownEditor';
import MetadataBar from '@/components/common/MetadataBar';
import { deleteArticle } from '@/api/article';
import type { TreeDataNode } from '@/types';

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

function findNodeTitle(nodes: TreeDataNode[], key: string): string | null {
  return findNode(nodes, key)?.title ?? null;
}

export default function ArticleEditPage() {
  const { articleCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentArticle = useArticleStore(s => s.currentArticle);
  const isSaving = useArticleStore(s => s.isSaving);
  const loadArticle = useArticleStore(s => s.loadArticle);
  const initNewArticle = useArticleStore(s => s.initNewArticle);
  const setTitle = useArticleStore(s => s.setTitle);
  const saveArticle = useArticleStore(s => s.saveArticle);
  const publishArticle = useArticleStore(s => s.publishArticle);
  const offlineArticle = useArticleStore(s => s.offlineArticle);
  const reset = useArticleStore(s => s.reset);
  const treeData = useTreeStore(s => s.treeData);
  const syncSelection = useTreeStore(s => s.syncSelection);

  // 是否为最外层目录下的内容（父级是根目录则不显示返回按钮）
  const isTopLevel = useMemo(() => {
    if (!articleCode || articleCode === 'new') {
      const folderCode = searchParams.get('folderCode') || currentArticle?.folderCode;
      if (!folderCode) return true;
      const folderKey = `folder-${folderCode}`;
      const node = findNode(treeData, folderKey);
      return !node?.parentKey || node.parentKey === '-1';
    }
    const articleKey = `article-${articleCode}`;
    const node = findNode(treeData, articleKey);
    return !node?.parentKey || node.parentKey === '-1';
  }, [articleCode, searchParams, treeData, currentArticle?.folderCode]);

  // 查找当前文章所属目录的名称
  const parentFolderTitle = useMemo(() => {
    if (isTopLevel) return null;
    if (!articleCode || articleCode === 'new') {
      const folderCode = searchParams.get('folderCode') || currentArticle?.folderCode;
      if (!folderCode) return null;
      const folderKey = `folder-${folderCode}`;
      return findNodeTitle(treeData, folderKey);
    }
    const articleKey = `article-${articleCode}`;
    const node = findNode(treeData, articleKey);
    if (node?.parentKey) {
      return findNodeTitle(treeData, node.parentKey);
    }
    return null;
  }, [articleCode, searchParams, treeData, currentArticle?.folderCode, isTopLevel]);

  useEffect(() => {
    if (articleCode === 'new') {
      const folderCode = searchParams.get('folderCode') || '';
      initNewArticle(folderCode);
      // 新建文章时定位到所属目录
      if (folderCode) syncSelection(`folder-${folderCode}`);
    } else if (articleCode) {
      loadArticle(articleCode);
      syncSelection(`article-${articleCode}`);
    }
    return () => reset();
  }, [articleCode, searchParams, loadArticle, initNewArticle, reset, syncSelection]);

  const handleSave = async () => {
    try {
      if (currentArticle?.status === 'PUBLISHED') {
        Modal.confirm({ title: '确认保存', content: '此文章已发布，保存后状态将变为草稿，需重新发布', onOk: () => doSave() });
      } else {
        await doSave();
      }
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  const doSave = async () => {
    await saveArticle();
    message.success('保存成功');
  };

  const handlePublish = async () => {
    try { await publishArticle(); message.success('发布成功'); }
    catch (e: any) { message.error(e.message || '发布失败'); }
  };

  const handleOffline = async () => {
    try { await offlineArticle(); message.success('已下线'); }
    catch (e: any) { message.error(e.message || '下线失败'); }
  };

  const handleDelete = async () => {
    if (!articleCode) return;
    Modal.confirm({ title: '确认删除', content: '删除后不可恢复', onOk: async () => {
      await deleteArticle(articleCode);
      message.success('已删除');
      navigate(-1);
    }});
  };

  if (!currentArticle) return <div>加载中...</div>;

  return (
    <div className="article-edit-page">
      <div className="toolbar">
        {!isTopLevel && <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>{parentFolderTitle || '返回'}</Button>}
        <Input className="title-input" value={currentArticle.title} onChange={e => setTitle(e.target.value)} placeholder="文章标题" />
        <ArticleStatusBadge status={currentArticle.status} />
        <Button loading={isSaving} icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
        {currentArticle.status === 'DRAFT' && <Button type="primary" icon={<SendOutlined />} onClick={handlePublish}>发布</Button>}
        {currentArticle.status === 'PUBLISHED' && <Button onClick={handleOffline}>下线</Button>}
        <Dropdown menu={{ items: [{ key: 'delete', label: '删除文章', danger: true, onClick: handleDelete }] }}>
          <Button>更多 <DownOutlined /></Button>
        </Dropdown>
      </div>
      <div className="editor-body">
        <MarkdownEditor />
      </div>
      <MetadataBar updatedAt={currentArticle.updatedAt || null} />
    </div>
  );
}
