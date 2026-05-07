import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Tree, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import TreeNodeTitle from './TreeNodeTitle';
import { useTreeStore } from '@/store/tree-store';
import { useNavigate } from 'react-router-dom';
import { updateFolderSort, moveFolder } from '@/api/folder';
import { updateArticleSort, moveArticle } from '@/api/article';
import type { TreeDataNode } from '@/types';

/** rc-tree 中 allowDrop 的 dropPosition 含义：
 *  -1 = 拖到节点上方（间隙）
 *   0 = 拖入节点内部（作为子节点）
 *   1 = 拖到节点下方（间隙）
 */
const DROP_INTO = 0;

/** 占位子节点 key 前缀，用于让空目录也能接受"拖入"操作 */
const DROP_PLACEHOLDER_PREFIX = '__drop_ph__';

interface FolderTreeProps {
  mode: 'admin' | 'portal';
}

/** 从 key 解析类型和编码 */
function parseKey(key: string) {
  const isFolder = key.startsWith('folder-');
  return {
    type: isFolder ? 'folder' as const : 'article' as const,
    code: key.replace(/^(folder|article)-/, ''),
  };
}

export default function FolderTree({ mode }: FolderTreeProps) {
  const navigate = useNavigate();
  const treeData = useTreeStore(s => s.treeData);
  const expandedKeys = useTreeStore(s => s.expandedKeys);
  const selectedKey = useTreeStore(s => s.selectedKey);
  const loadRootNodes = useTreeStore(s => s.loadRootNodes);
  const expandFolder = useTreeStore(s => s.expandFolder);
  const selectNode = useTreeStore(s => s.selectNode);
  const setExpandedKeys = useTreeStore(s => s.setExpandedKeys);
  const setMode = useTreeStore(s => s.setMode);

  // 拖拽自动展开相关
  const dragExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOverKeyRef = useRef<string | null>(null);

  useEffect(() => { setMode(mode); }, [setMode, mode]);
  useEffect(() => { loadRootNodes(); }, [loadRootNodes]);

  // selectedKey 变化时自动滚动到该节点
  useEffect(() => {
    if (!selectedKey) return;

    const scrollToSelected = () => {
      const container = document.querySelector('.sidebar-tree');
      const node = container?.querySelector('.ant-tree-treenode-selected') as HTMLElement | null;
      if (node) {
        node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return true;
      }
      return false;
    };

    if (!scrollToSelected()) {
      const t1 = setTimeout(scrollToSelected, 100);
      const t2 = setTimeout(scrollToSelected, 300);
      const t3 = setTimeout(scrollToSelected, 600);
      const t4 = setTimeout(scrollToSelected, 1000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }
  }, [selectedKey]);

  const handleSelect = useCallback((keys: React.Key[]) => {
    const key = keys[0] as string;
    if (key?.startsWith(DROP_PLACEHOLDER_PREFIX)) return;
    selectNode(key || null);
    if (!key) {
      document.title = 'CMS 知识库';
      return;
    }
    const { code, type } = parseKey(key);
    const prefix = mode === 'admin' ? '/admin' : '/portal';
    navigate(`${prefix}/${type}/${code}`);

    const node = findNodeByKey(treeData, key);
    document.title = node ? `${node.title} - CMS 知识库` : 'CMS 知识库';
  }, [selectNode, navigate, mode, treeData]);

  const handleExpand = useCallback((keys: React.Key[]) => {
    setExpandedKeys(keys as string[]);
    const added = keys.find(k => !expandedKeys.includes(k as string));
    if (added) expandFolder(added as string);
  }, [setExpandedKeys, expandFolder, expandedKeys]);

  /** 拖拽进入节点时，如果是折叠的目录，延迟自动展开 */
  const handleDragEnter = useCallback((info: any) => {
    const key = info.node.key as string;
    if (!key.startsWith('folder-')) return;
    if (expandedKeys.includes(key)) return;

    if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
    }
    dragOverKeyRef.current = key;

    dragExpandTimerRef.current = setTimeout(() => {
      if (dragOverKeyRef.current === key) {
        const newKeys = [...expandedKeys, key];
        setExpandedKeys(newKeys);
        expandFolder(key);
      }
    }, 600);
  }, [expandedKeys, setExpandedKeys, expandFolder]);

  const handleDragLeave = useCallback((_info: any) => {
    if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }
    dragOverKeyRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }
    dragOverKeyRef.current = null;
  }, []);

  /** 允许拖放规则：
   * 1. 不能拖到自己上面
   * 2. dropPosition === 0 表示拖入节点内部，只允许目录节点接受
   * 3. 目录不能拖到自己的子目录内部（防止循环引用）
   * 4. 占位节点不接受拖放
   */
  const allowDrop = ({ dragNode, dropNode, dropPosition }: any) => {
    const dragKey = dragNode.key as string;
    const dropKey = dropNode.key as string;

    if (dragKey === dropKey) return false;
    if (dropKey.startsWith(DROP_PLACEHOLDER_PREFIX)) return false;
    if (dragKey.startsWith(DROP_PLACEHOLDER_PREFIX)) return false;

    if (dropPosition === DROP_INTO) {
      // 拖入节点内部 — 只允许目录
      if (!dropKey.startsWith('folder-')) return false;
      // 目录不能拖入自己的后代目录
      if (dragKey.startsWith('folder-')) {
        return !isDescendant(treeData, dragKey, dropKey);
      }
      return true;
    }

    return true;
  };

  const handleDrop = async (info: any) => {
    // 清理自动展开定时器
    if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }

    const dragKey = info.dragNode.key as string;
    const dropKey = info.node.key as string;

    // 忽略占位节点
    if (dragKey.startsWith(DROP_PLACEHOLDER_PREFIX) || dropKey.startsWith(DROP_PLACEHOLDER_PREFIX)) return;

    // 从 treeStore 中查找节点信息（不依赖 rc-tree DataNode 的自定义属性）
    const store = useTreeStore.getState();
    const dragStoreNode = findNodeByKey(store.treeData, dragKey);
    const dropStoreNode = findNodeByKey(store.treeData, dropKey);

    if (!dragStoreNode) return;

    const dragType = parseKey(dragKey).type;
    const dropType = parseKey(dropKey).type;
    const movingCode = parseKey(dragKey).code;
    const dragParentKey = dragStoreNode.parentKey;
    const dropParentKey = dropStoreNode?.parentKey;

    try {
      if (!info.dropToGap) {
        // ===== 拖入目录内部 =====
        if (!dropKey.startsWith('folder-')) return;
        const targetFolderCode = parseKey(dropKey).code;

        if (dragType === 'folder') {
          await moveFolder({ folderCode: movingCode, targetParentFolderCode: targetFolderCode });
        } else {
          await moveArticle({ articleCode: movingCode, targetFolderCode });
        }
        await refreshAffected(dragParentKey, dropKey);
      } else {
        // ===== 拖到间隙（排序或跨层级移动） =====
        const dropNodePos = (info.node.pos as string).split('-');
        const dropNodeIndex = Number(dropNodePos[dropNodePos.length - 1]);
        const position = info.dropPosition <= dropNodeIndex ? 'BEFORE' : 'AFTER';

        // 如果拖到目录上方/下方，目标父级是该目录的父级
        // 如果拖到文章上方/下方，目标父级也是该文章的父级
        const targetFolderKey = dropParentKey || '-1';
        const isSameParent = dragParentKey === targetFolderKey;
        const isSameType = dragType === dropType;

        if (isSameParent && isSameType) {
          // 同层级同类型 → 排序
          const targetCode = parseKey(dropKey).code;
          if (dragType === 'folder') {
            await updateFolderSort({ movingCode, targetCode, position });
          } else {
            await updateArticleSort({ movingCode, targetCode, position });
          }
          if (dragParentKey === '-1') {
            await store.refreshRootNodes();
          } else {
            await store.refreshChildren(dragParentKey);
          }
        } else {
          // 跨层级 或 同层级跨类型 → 移动
          const targetFolderCode = targetFolderKey === '-1'
            ? '-1'
            : parseKey(targetFolderKey).code;

          if (dragType === 'folder') {
            const folderTargetCode = isSameType ? parseKey(dropKey).code : undefined;
            await moveFolder({
              folderCode: movingCode,
              targetParentFolderCode: targetFolderCode,
              targetCode: folderTargetCode || undefined,
              position: folderTargetCode ? position : undefined,
            });
          } else {
            const articleTargetCode = isSameType ? parseKey(dropKey).code : undefined;
            await moveArticle({
              articleCode: movingCode,
              targetFolderCode,
              targetCode: articleTargetCode || undefined,
              position: articleTargetCode ? position : undefined,
            });
          }
          await refreshAffected(dragParentKey, targetFolderKey);
        }
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '操作失败');
    }
  };

  /** 移动后刷新所有受影响的节点 */
  const refreshAffected = async (sourceParentKey: string, targetParentKey: string) => {
    const store = useTreeStore.getState();
    const keysToRefresh = new Set<string>();

    if (sourceParentKey === '-1') {
      await store.refreshRootNodes();
    } else {
      keysToRefresh.add(sourceParentKey);
    }

    if (targetParentKey === '-1') {
      await store.refreshRootNodes();
    } else {
      keysToRefresh.add(targetParentKey);
    }

    for (const key of keysToRefresh) {
      await store.refreshChildren(key);
    }
  };

  const antTreeData = useMemo<DataNode[]>(
    () => treeData.map(n => convertNode(n, mode)),
    [treeData, mode]
  );

  return (
    <Tree
      className="sidebar-tree"
      treeData={antTreeData}
      expandedKeys={expandedKeys}
      selectedKeys={selectedKey ? [selectedKey] : []}
      onSelect={handleSelect}
      onExpand={handleExpand}
      draggable={mode === 'admin' ? { icon: false, nodeDraggable: () => true } : false}
      onDrop={handleDrop}
      allowDrop={allowDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
      blockNode
    />
  );
}

function findNodeByKey(nodes: TreeDataNode[], key: string): TreeDataNode | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

/** 检查 targetKey 是否是 dragKey 的后代（防止循环引用） */
function isDescendant(nodes: TreeDataNode[], dragKey: string, targetKey: string): boolean {
  const dragNode = findNodeByKey(nodes, dragKey);
  if (!dragNode?.children) return false;
  for (const child of dragNode.children) {
    if (child.key === targetKey) return true;
    if (isDescendant(nodes, child.key, targetKey)) return true;
  }
  return false;
}

function convertNode(node: TreeDataNode, mode: 'admin' | 'portal'): DataNode {
  const isAdmin = mode === 'admin';
  const isFolder = node.type === 'folder';

  // 过滤掉加载占位符和拖拽占位符，获取真实子节点
  const realChildren = node.children?.filter(
    c => c.key !== '__loading__' && !c.key.startsWith(DROP_PLACEHOLDER_PREFIX)
  ) || [];

  // 管理模式下目录：
  // 1. isLeaf 设为 false（始终可展开）
  // 2. 如果没有真实子节点，添加隐藏占位子节点让 rc-tree 允许"拖入"
  if (isAdmin && isFolder) {
    const convertedChildren = realChildren.map(c => convertNode(c, mode));
    if (convertedChildren.length === 0) {
      convertedChildren.push({
        key: `${DROP_PLACEHOLDER_PREFIX}${node.key}`,
        title: <span className="drop-placeholder-node" />,
        isLeaf: true,
        disabled: true,
        selectable: false,
      } as DataNode);
    }
    return {
      key: node.key,
      title: <TreeNodeTitle node={node} mode={mode} />,
      isLeaf: false,
      children: convertedChildren,
    } as DataNode;
  }

  return {
    key: node.key,
    title: <TreeNodeTitle node={node} mode={mode} />,
    isLeaf: node.isLeaf,
    children: realChildren.length > 0 ? realChildren.map(c => convertNode(c, mode)) : undefined,
  } as DataNode;
}
