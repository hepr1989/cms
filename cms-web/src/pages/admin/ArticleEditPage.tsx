import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Dropdown, message, Modal, Select, Typography } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, DownOutlined, HistoryOutlined } from '@ant-design/icons';
import { useArticleStore } from '@/store/article-store';
import { useTreeStore } from '@/store/tree-store';
import { useAuthStore } from '@/store/auth-store';
import ArticleStatusBadge from '@/components/article/ArticleStatusBadge';
import MarkdownEditor from '@/components/article/MarkdownEditor';
import MetadataBar from '@/components/common/MetadataBar';
import { deleteArticle } from '@/api/article';
import { getMyPermissions } from '@/api/permission';
import * as versionApi from '@/api/version';
import { ArticleStatus } from '@/types';
import PageLoading from '@/components/common/PageLoading';
import { formatDateTime } from '@/utils/constants';
import type { ArticleVersionVO } from '@/types/version';
import type { TreeDataNode } from '@/types';

const { Text } = Typography;

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
  const removeNode = useTreeStore(s => s.removeNode);
  const updateNode = useTreeStore(s => s.updateNode);
  const addArticleNode = useTreeStore(s => s.addArticleNode);
  const isAdmin = useAuthStore(s => s.isAdmin);
  const user = useAuthStore(s => s.user);

  // Version state
  const [versions, setVersions] = useState<ArticleVersionVO[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionContent, setVersionContent] = useState<ArticleVersionVO | null>(null);
  const versionsLoadingRef = useRef<string | null>(null);

  // Permission state
  const [canEdit, setCanEdit] = useState(true);

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

  // Load permission check
  useEffect(() => {
    if (!currentArticle?.folderCode || !user) return;
    if (isAdmin()) {
      setCanEdit(true);
      return;
    }
    getMyPermissions().then(perms => {
      const list = perms as unknown as { folderCode: string }[];
      setCanEdit(list.some(p => p.folderCode === currentArticle.folderCode));
    }).catch(() => setCanEdit(false));
  }, [currentArticle?.folderCode, user]);

  // Load versions
  useEffect(() => {
    if (!articleCode || articleCode === 'new') return;
    // 防止 StrictMode 二次挂载或 versionNumber 变化时重复请求
    if (versionsLoadingRef.current === articleCode) return;
    versionsLoadingRef.current = articleCode;
    versionApi.getVersions(articleCode).then(data => {
      setVersions((data as unknown as ArticleVersionVO[]) || []);
    }).catch(() => {}).finally(() => {
      versionsLoadingRef.current = null;
    });
  }, [articleCode, currentArticle?.versionNumber]);

  useEffect(() => {
    if (articleCode === 'new') {
      const folderCode = searchParams.get('folderCode') || '';
      initNewArticle(folderCode);
      if (folderCode) syncSelection(`folder-${folderCode}`);
    } else if (articleCode) {
      // 先加载文章获取 folderCode，再展开树路径
      loadArticle(articleCode).then(() => {
        const fc = useArticleStore.getState().currentArticle?.folderCode;
        syncSelection(`article-${articleCode}`, fc);
      });
      setSelectedVersion(null);
      setVersionContent(null);
    }
    return () => reset();
  }, [articleCode, searchParams, loadArticle, initNewArticle, reset, syncSelection]);

  const handleVersionChange = async (value: string) => {
    if (value === 'current') {
      setSelectedVersion(null);
      setVersionContent(null);
      return;
    }
    const vNum = parseInt(value);
    setSelectedVersion(vNum);
    if (articleCode) {
      try {
        const detail = await versionApi.getVersionDetail(articleCode, vNum) as unknown as ArticleVersionVO;
        setVersionContent(detail);
      } catch {
        message.error('加载版本详情失败');
      }
    }
  };

  const isViewingHistory = selectedVersion !== null;

  const handleSave = () => {
    Modal.confirm({
      title: '确认保存',
      okText: '确认',
      cancelText: '取消',
      content: currentArticle?.status === 'PUBLISHED'
        ? '此文章已发布，保存后状态将变为草稿，需重新发布'
        : '确定要保存当前文章吗？',
      onOk: () => doSave(),
    });
  };

  const doSave = async () => {
    try {
      const isNew = !currentArticle?.articleCode;
      const result = await saveArticle();
      if (result.articleCode) {
        if (isNew) {
          addArticleNode(`folder-${result.folderCode}`, result);
          navigate(`/admin/article/${result.articleCode}`, { replace: true });
        } else {
          updateNode(`article-${result.articleCode}`, { title: result.title, status: result.status });
        }
      }
      message.success('保存成功');
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  // Ctrl+S 快捷保存
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePublish = () => {
    Modal.confirm({
      title: '确认发布',
      okText: '确认',
      cancelText: '取消',
      content: '发布后文章将对前台可见，确定发布吗？',
      onOk: async () => {
        try {
          await publishArticle();
          updateNode(`article-${articleCode}`, { status: ArticleStatus.PUBLISHED });
          message.success('发布成功');
        } catch (e: any) { message.error(e.message || '发布失败'); }
      },
    });
  };

  const handleOffline = () => {
    Modal.confirm({
      title: '确认下线',
      okText: '确认',
      cancelText: '取消',
      content: '下线后文章将不再对前台可见，确定下线吗？',
      onOk: async () => {
        try {
          await offlineArticle();
          updateNode(`article-${articleCode}`, { status: ArticleStatus.OFFLINE });
          message.success('已下线');
        } catch (e: any) { message.error(e.message || '下线失败'); }
      },
    });
  };

  const handleDelete = () => {
    if (!articleCode) return;
    Modal.confirm({
      title: '确认删除',
      okText: '确认',
      cancelText: '取消',
      content: '删除后不可恢复，确定删除吗？',
      onOk: async () => {
        await deleteArticle(articleCode);
        removeNode(`article-${articleCode}`);
        message.success('已删除');
        navigate(-1);
      },
    });
  };

  if (!currentArticle) return <PageLoading />;

  const versionOptions = [
    { label: `V${currentArticle.versionNumber || 1}（当前）`, value: 'current' },
    ...versions.map(v => ({
      label: `V${v.versionNumber}`,
      value: String(v.versionNumber),
    })),
  ];

  return (
    <div className="article-edit-page">
      <div className="toolbar">
        {!isTopLevel && <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>{parentFolderTitle || '返回'}</Button>}
        <Input
          className="title-input"
          value={isViewingHistory && versionContent ? versionContent.title : currentArticle.title}
          onChange={e => !isViewingHistory && canEdit && setTitle(e.target.value)}
          placeholder="文章标题"
          readOnly={isViewingHistory || !canEdit}
        />
        <ArticleStatusBadge status={isViewingHistory ? versionContent?.status || '' : currentArticle.status} />

        {/* Version selector */}
        {(articleCode && articleCode !== 'new' && versions.length > 0) && (
          <Select
            style={{ width: 120 }}
            value={selectedVersion !== null ? String(selectedVersion) : 'current'}
            onChange={handleVersionChange}
            options={versionOptions}
            suffixIcon={<HistoryOutlined />}
            size="small"
          />
        )}

        {canEdit && !isViewingHistory && (
          <>
            <Button loading={isSaving} icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
            {currentArticle.status === 'DRAFT' && <Button type="primary" icon={<SendOutlined />} onClick={handlePublish}>发布</Button>}
            {currentArticle.status === 'PUBLISHED' && <Button onClick={handleOffline}>下线</Button>}
            <Dropdown menu={{ items: [{ key: 'delete', label: '删除文章', danger: true, onClick: handleDelete }] }}>
              <Button>更多 <DownOutlined /></Button>
            </Dropdown>
          </>
        )}
        {!canEdit && !isViewingHistory && (
          <Button disabled icon={<SaveOutlined />}>无编辑权限</Button>
        )}
      </div>

      {/* Version info bar */}
      {isViewingHistory && versionContent && (
        <div style={{
          padding: '8px 16px', background: '#fffbe6', borderBottom: '1px solid #ffe58f',
          fontSize: 13, color: '#874d00',
        }}>
          修改人：{versionContent.createdBy} &nbsp;&nbsp; 修改时间：{formatDateTime(versionContent.createdAt)}
          &nbsp;&nbsp;（历史版本，只读模式）
        </div>
      )}

      <div className="editor-body">
        {isViewingHistory ? (
          <MarkdownEditor readOnly value={versionContent?.contentMd || ''} />
        ) : (
          <MarkdownEditor readOnly={!canEdit} />
        )}
      </div>
      <MetadataBar
        updatedAt={currentArticle.updatedAt || null}
        updatedBy={currentArticle.updatedBy}
      />
    </div>
  );
}
