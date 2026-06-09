import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TreeDataNode, FolderVO, ArticleVO } from '@/types';
import { getRootFolders, getChildren, getAncestorPath } from '@/api/folder';

type TreeMode = 'admin' | 'portal';

interface TreeState {
  treeData: TreeDataNode[];
  loadedKeys: string[];
  expandedKeys: string[];
  selectedKey: string | null;
  loadingKeys: string[];
  rootLoading: boolean;
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
  syncSelection: (key: string, folderCode?: string) => Promise<void>;
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

/** 递归收集所有后代目录 key */
function collectDescendantFolderKeys(nodes: TreeDataNode[]): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    if (node.type === 'folder') {
      result.push(node.key);
    }
    if (node.children) {
      result.push(...collectDescendantFolderKeys(node.children));
    }
  }
  return result;
}

/** 重新加载所有已展开但未加载子节点的目录，保持展开状态（BFS 波次并行） */
async function reloadExpandedFolders(get: () => TreeState) {
  let hasMore = true;
  while (hasMore) {
    const { expandedKeys, loadedKeys, loadingKeys, treeData } = get();
    const toLoad: string[] = [];
    for (const key of expandedKeys) {
      if (loadedKeys.includes(key) || loadingKeys.includes(key)) continue;
      if (!findNode(treeData, key)) continue;
      toLoad.push(key);
    }
    if (toLoad.length === 0) break;
    await Promise.all(toLoad.map(key => get().loadChildren(key)));
    // 如果有新一层的目录可见了，继续下一波
    hasMore = get().expandedKeys.some(k =>
      !get().loadedKeys.includes(k) && !get().loadingKeys.includes(k) && findNode(get().treeData, k));
  }
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

// 模块级 Promise 缓存，防止 StrictMode 二次挂载发出重复请求
const syncSelectionPromises = new Map<string, Promise<void>>();

/** syncSelection 的实际执行逻辑，提取为独立函数以便在 store 外部定义 Promise 缓存 */
async function doSyncSelection(key: string, folderCode?: string) {
  const store = useTreeStore.getState();
  if (store.selectedKey === key) return;

  // 确保根节点已加载
  if (store.treeData.length === 0) {
    await store.loadRootNodes();
  }

  // 先检查目标是否已在树中可见
  let path = findPathToNode(useTreeStore.getState().treeData, key);

  if (!path) {
    // 用 getAncestorPath 获取从根到目标的路径（替代 getAllFoldersFlat 全量加载）
    try {
      // 确定目标所在栏目
      let targetFolderCode: string | null = null;
      if (key.startsWith('folder-')) {
        targetFolderCode = key.replace('folder-', '');
      } else if (key.startsWith('article-')) {
        if (folderCode) {
          targetFolderCode = folderCode;
        } else {
          const articleNode = findNode(useTreeStore.getState().treeData, key);
          if (articleNode?.parentKey && articleNode.parentKey.startsWith('folder-')) {
            targetFolderCode = articleNode.parentKey.replace('folder-', '');
          }
        }
      }

      if (targetFolderCode) {
        const pathFolderCodes = await getAncestorPath(targetFolderCode) as unknown as string[];

        // 逐层加载路径上的栏目子节点
        for (const code of pathFolderCodes) {
          const folderKey = `folder-${code}`;
          if (!useTreeStore.getState().loadedKeys.includes(folderKey)) {
            await useTreeStore.getState().loadChildren(folderKey);
          }
        }
      }
    } catch {
      // 获取栏目列表失败，忽略
    }

    // 重新查找路径
    path = findPathToNode(useTreeStore.getState().treeData, key);
  }

  if (!path) return;

  // 展开路径上的所有目录
  for (const folderKey of path) {
    const state = useTreeStore.getState();
    if (!state.expandedKeys.includes(folderKey)) {
      useTreeStore.setState(s => { s.expandedKeys.push(folderKey); });
    }
    if (!state.loadedKeys.includes(folderKey)) {
      await useTreeStore.getState().loadChildren(folderKey);
    }
  }

  useTreeStore.setState({ selectedKey: key });

  const node = findNode(useTreeStore.getState().treeData, key);
  if (node) {
    document.title = `${node.title} - CMS 知识库`;
  }
}

export const useTreeStore = create<TreeState>()(immer((set, get) => ({
  treeData: [],
  loadedKeys: [],
  expandedKeys: [],
  selectedKey: null,
  loadingKeys: [],
  rootLoading: false,
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
    if (get().treeData.length > 0 || get().rootLoading) return;
    set(state => { state.rootLoading = true; });
    try {
      const portalMode = get().mode === 'portal';
      const folders = await getRootFolders(portalMode) as unknown as FolderVO[];
      const nodes = folders.map(f => folderToNode(f, '-1'));
      set({ treeData: nodes });
    } finally {
      set(state => { state.rootLoading = false; });
    }
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
        // 收集所有后代目录 key，清理 loadedKeys（保留 expandedKeys）
        // 刷新后通过 reloadExpandedFolders 自动重新加载已展开的子目录
        if (parentNode.children) {
          const descendantKeys = collectDescendantFolderKeys(parentNode.children);
          state.loadedKeys = state.loadedKeys.filter(k => !descendantKeys.includes(k));
        }
        parentNode.children = parentNode.hasChildren
          ? [{ key: '__loading__', title: '加载中...', type: 'folder', isLeaf: true, parentKey: folderKey, code: '' }]
          : undefined;
      }
    });
    await get().loadChildren(folderKey);
    // 重新加载所有已展开但未加载子节点的目录，保持展开状态
    await reloadExpandedFolders(get);
  },

  refreshRootNodes: async () => {
    const portalMode = get().mode === 'portal';
    const folders = await getRootFolders(portalMode) as unknown as FolderVO[];
    const nodes = folders.map(f => folderToNode(f, '-1'));
    // 清除加载状态但保留展开状态，刷新后自动重新加载已展开的子目录
    set({ treeData: nodes, loadedKeys: [] });
    // 重新加载所有已展开但未加载子节点的目录
    await reloadExpandedFolders(get);
  },

  setExpandedKeys: (keys: string[]) => {
    set({ expandedKeys: keys });
  },

  /** 根据目标 key 自动展开父级路径并选中该节点 */
  syncSelection: (key: string, folderCode?: string) => {
    if (get().selectedKey === key) return Promise.resolve();

    // 同一节点正在同步，复用已有 Promise（防止 StrictMode 二次挂载重复请求）
    const cacheKey = `${key}|${folderCode || ''}`;
    const existing = syncSelectionPromises.get(cacheKey);
    if (existing) return existing;

    const promise = doSyncSelection(key, folderCode);
    syncSelectionPromises.set(cacheKey, promise);
    promise.finally(() => syncSelectionPromises.delete(cacheKey));
    return promise;
  },
})));
