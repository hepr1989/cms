import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TreeDataNode, FolderVO, ArticleVO } from '@/types';
import { getRootFolders, getChildren } from '@/api/folder';

type TreeMode = 'admin' | 'portal';

interface TreeState {
  treeData: TreeDataNode[];
  loadedKeys: string[];
  expandedKeys: string[];
  selectedKey: string | null;
  loadingKeys: string[];
  mode: TreeMode;

  setMode: (mode: TreeMode) => void;
  loadRootNodes: () => Promise<void>;
  loadChildren: (folderKey: string) => Promise<void>;
  expandFolder: (key: string) => Promise<void>;
  collapseFolder: (key: string) => void;
  selectNode: (key: string | null) => void;
  addFolderNode: (parentKey: string, folder: FolderVO) => void;
  addArticleNode: (parentKey: string, article: ArticleVO) => void;
  removeNode: (key: string) => void;
  updateNode: (key: string, partial: Partial<TreeDataNode>) => void;
  refreshChildren: (folderKey: string) => Promise<void>;
  refreshRootNodes: () => Promise<void>;
  setExpandedKeys: (keys: string[]) => void;
  syncSelection: (key: string) => Promise<void>;
}

function folderToNode(f: FolderVO, parentKey: string): TreeDataNode {
  const hasContent = (f.childrenCount > 0) || ((f.articleCount ?? 0) > 0);
  return {
    key: `folder-${f.folderCode}`,
    title: f.title,
    type: 'folder',
    isLeaf: !hasContent,
    parentKey,
    code: f.folderCode,
    status: f.status,
    sort: f.sort,
    hasChildren: hasContent,
    children: hasContent ? [{ key: '__loading__', title: '加载中...', type: 'folder', isLeaf: true, parentKey: `folder-${f.folderCode}`, code: '' }] : undefined,
  };
}

function articleToNode(a: ArticleVO, parentKey: string): TreeDataNode {
  return {
    key: `article-${a.articleCode}`,
    title: a.title,
    type: 'article',
    isLeaf: true,
    parentKey,
    code: a.articleCode,
    status: a.status,
    sort: a.sort,
  };
}

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

/** 递归查找从根到目标 key 的路径 */
function findPathToNode(nodes: TreeDataNode[], targetKey: string): string[] | null {
  for (const node of nodes) {
    if (node.key === targetKey) return [];
    if (node.children) {
      const sub = findPathToNode(node.children, targetKey);
      if (sub !== null) return [node.key, ...sub];
    }
  }
  return null;
}

function removeNodeFromList(nodes: TreeDataNode[], key: string): TreeDataNode[] {
  return nodes
    .filter(n => n.key !== key)
    .map(n => n.children ? { ...n, children: removeNodeFromList(n.children, key) } : n);
}

/** 收集树中所有未加载的目录 key（跳过叶子节点和 __loading__ 占位） */
function collectUnloadedFolderKeys(nodes: TreeDataNode[], loadedKeys: string[]): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    if (node.key === '__loading__') continue;
    if (node.type === 'folder' && !node.isLeaf && !loadedKeys.includes(node.key)) {
      result.push(node.key);
    }
    if (node.children) {
      result.push(...collectUnloadedFolderKeys(node.children, loadedKeys));
    }
  }
  return result;
}

export const useTreeStore = create<TreeState>()(immer((set, get) => ({
  treeData: [],
  loadedKeys: [],
  expandedKeys: [],
  selectedKey: null,
  loadingKeys: [],
  mode: 'admin' as TreeMode,

  setMode: (mode: TreeMode) => {
    const currentMode = get().mode;
    if (currentMode === mode) return;
    // Mode changed: reset tree and reload
    set({ mode, treeData: [], loadedKeys: [], expandedKeys: [], selectedKey: null, loadingKeys: [] });
    get().loadRootNodes();
  },

  loadRootNodes: async () => {
    // 防止重复加载（页面刷新时 syncSelection 和 FolderTree 可能同时调用）
    if (get().treeData.length > 0) return;
    const portalMode = get().mode === 'portal';
    const folders = await getRootFolders(portalMode) as unknown as FolderVO[];
    const nodes = folders.map(f => folderToNode(f, '-1'));
    set({ treeData: nodes });
  },

  loadChildren: async (folderKey: string) => {
    const { loadedKeys, loadingKeys, mode } = get();
    if (loadedKeys.includes(folderKey) || loadingKeys.includes(folderKey)) return;

    const portalMode = mode === 'portal';
    const folderCode = folderKey.replace('folder-', '');
    set(state => { state.loadingKeys.push(folderKey); });

    try {
      const data = await getChildren(folderCode, portalMode) as any;
      const folderNodes = (data.folders || []).map((f: FolderVO) => folderToNode(f, folderKey));
      const articleNodes = (data.articles || []).map((a: ArticleVO) => articleToNode(a, folderKey));
      const children = [...folderNodes, ...articleNodes];

      set(state => {
        const parentNode = findNode(state.treeData, folderKey);
        if (parentNode) {
          parentNode.children = children.length > 0 ? children : undefined;
          parentNode.isLeaf = children.length === 0;
        }
        state.loadedKeys.push(folderKey);
        state.loadingKeys = state.loadingKeys.filter(k => k !== folderKey);
      });
    } catch {
      set(state => {
        state.loadingKeys = state.loadingKeys.filter(k => k !== folderKey);
      });
    }
  },

  expandFolder: async (key: string) => {
    const { loadedKeys, expandedKeys } = get();
    if (!expandedKeys.includes(key)) {
      set(state => { state.expandedKeys.push(key); });
    }
    if (!loadedKeys.includes(key)) {
      await get().loadChildren(key);
    }
  },

  collapseFolder: (key: string) => {
    set(state => {
      state.expandedKeys = state.expandedKeys.filter(k => k !== key);
    });
  },

  selectNode: (key: string | null) => {
    set({ selectedKey: key });
  },

  addFolderNode: (parentKey: string, folder: FolderVO) => {
    const node = folderToNode(folder, parentKey);
    set(state => {
      if (parentKey === '-1') {
        state.treeData.push(node);
      } else {
        const parentNode = findNode(state.treeData, parentKey);
        if (parentNode) {
          if (!parentNode.children) parentNode.children = [];
          parentNode.children.push(node);
          parentNode.isLeaf = false;
          parentNode.hasChildren = true;
        }
      }
    });
  },

  addArticleNode: (parentKey: string, article: ArticleVO) => {
    const node = articleToNode(article, parentKey);
    set(state => {
      const parentNode = findNode(state.treeData, parentKey);
      if (parentNode) {
        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(node);
      }
    });
  },

  removeNode: (key: string) => {
    set(state => {
      state.treeData = removeNodeFromList(state.treeData, key);
      if (state.selectedKey === key) state.selectedKey = null;
    });
  },

  updateNode: (key: string, partial: Partial<TreeDataNode>) => {
    set(state => {
      const node = findNode(state.treeData, key);
      if (node) Object.assign(node, partial);
    });
  },

  refreshChildren: async (folderKey: string) => {
    set(state => {
      state.loadedKeys = state.loadedKeys.filter(k => k !== folderKey);
      const parentNode = findNode(state.treeData, folderKey);
      if (parentNode) {
        // 清除子目录的 loadedKeys，因为重新加载后子目录节点会被重建（带 __loading__ 占位符）
        // 如果不清除，展开子目录时会因 loadedKeys 命中而跳过加载，导致无法展开
        if (parentNode.children) {
          for (const child of parentNode.children) {
            if (child.type === 'folder') {
              state.loadedKeys = state.loadedKeys.filter(k => k !== child.key);
            }
          }
        }
        parentNode.children = parentNode.hasChildren
          ? [{ key: '__loading__', title: '加载中...', type: 'folder', isLeaf: true, parentKey: folderKey, code: '' }]
          : undefined;
      }
    });
    await get().loadChildren(folderKey);
  },

  refreshRootNodes: async () => {
    const portalMode = get().mode === 'portal';
    const folders = await getRootFolders(portalMode) as unknown as FolderVO[];
    const nodes = folders.map(f => folderToNode(f, '-1'));
    set({ treeData: nodes });
  },

  setExpandedKeys: (keys: string[]) => {
    set({ expandedKeys: keys });
  },

  /** 根据目标 key 自动展开父级路径并选中该节点 */
  syncSelection: async (key: string) => {
    if (get().selectedKey === key) return;

    // 确保根节点已加载
    if (get().treeData.length === 0) {
      await get().loadRootNodes();
    }

    // 搜索阶段：只加载数据不展开目录，避免展开无关层级
    let path = findPathToNode(get().treeData, key);
    let maxRounds = 5;

    while (!path && maxRounds > 0) {
      const unloaded = collectUnloadedFolderKeys(get().treeData, get().loadedKeys);
      if (unloaded.length === 0) break;

      // 仅加载数据，不加入 expandedKeys
      for (const fk of unloaded) {
        if (!get().loadedKeys.includes(fk)) {
          await get().loadChildren(fk);
        }
        path = findPathToNode(get().treeData, key);
        if (path) break;
      }
      maxRounds--;
    }

    if (!path) return;

    // 只展开路径上的目录
    for (const folderKey of path) {
      if (!get().expandedKeys.includes(folderKey)) {
        set(state => { state.expandedKeys.push(folderKey); });
      }
      if (!get().loadedKeys.includes(folderKey)) {
        await get().loadChildren(folderKey);
      }
    }

    set({ selectedKey: key });

    const node = findNode(get().treeData, key);
    if (node) {
      document.title = `${node.title} - CMS 知识库`;
    }
  },
})));
