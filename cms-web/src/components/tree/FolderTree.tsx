import { useEffect, useCallback, useMemo } from 'react';
import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import TreeNodeTitle from './TreeNodeTitle';
import { useTreeStore } from '@/store/tree-store';
import { useNavigate } from 'react-router-dom';
import { updateFolderSort } from '@/api/folder';
import { updateArticleSort } from '@/api/article';
import type { TreeDataNode } from '@/types';

interface FolderTreeProps {
  mode: 'admin' | 'portal';
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

    // 多次重试，确保异步加载完成后 DOM 已渲染
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
    selectNode(key || null);
    if (!key) {
      document.title = 'CMS 知识库';
      return;
    }
    const code = key.replace(/^(folder|article)-/, '');
    const type = key.startsWith('folder-') ? 'folder' : 'article';
    const prefix = mode === 'admin' ? '/admin' : '/portal';
    navigate(`${prefix}/${type}/${code}`);

    // 同步浏览器标题
    const node = findNodeByKey(treeData, key);
    document.title = node ? `${node.title} - CMS 知识库` : 'CMS 知识库';
  }, [selectNode, navigate, mode, treeData]);

  const handleExpand = useCallback((keys: React.Key[]) => {
    setExpandedKeys(keys as string[]);
    const added = keys.find(k => !expandedKeys.includes(k as string));
    if (added) expandFolder(added as string);
  }, [setExpandedKeys, expandFolder, expandedKeys]);

  const allowDrop = ({ dragNode, dropNode, dropPosition }: any) => {
    if (dropPosition === -1) return false;
    return (dragNode as any).parentKey === (dropNode as any).parentKey;
  };

  const handleDrop = async (info: any) => {
    const dragKey = info.dragNode.key as string;
    const dropKey = info.node.key as string;
    const dragNode = info.dragNode as any;
    const dropNode = info.node as any;
    if (dragNode.parentKey !== dropNode.parentKey) return;

    const position = info.dropPosition < info.dropNodeIndex ? 'BEFORE' : 'AFTER';
    const movingCode = dragKey.replace(/^(folder|article)-/, '');
    const targetCode = dropKey.replace(/^(folder|article)-/, '');
    const type = dragKey.startsWith('folder-') ? 'folder' : 'article';

    try {
      if (type === 'folder') {
        await updateFolderSort({ movingCode, targetCode, position });
      } else {
        await updateArticleSort({ movingCode, targetCode, position });
      }
      const store = useTreeStore.getState();
      await store.refreshChildren(dragNode.parentKey);
    } catch {
      // Rollback handled by not updating tree
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
      draggable={mode === 'admin'}
      onDrop={handleDrop}
      allowDrop={allowDrop}
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

function convertNode(node: TreeDataNode, mode: 'admin' | 'portal'): DataNode {
  return {
    key: node.key,
    title: <TreeNodeTitle node={node} mode={mode} />,
    isLeaf: node.isLeaf,
    children: node.children?.filter(c => c.key !== '__loading__').map(c => convertNode(c, mode)),
  };
}
