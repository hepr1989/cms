import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTreeStore } from '../tree-store';

vi.mock('@/api/folder', () => ({
  getRootFolders: vi.fn().mockResolvedValue([
    { folderCode: 'f1', title: '目录1', childrenCount: 2, articleCount: 1, status: 1, sort: 0 },
  ]),
  getChildren: vi.fn().mockResolvedValue({
    folders: [
      { folderCode: 'f2', title: '子目录', childrenCount: 0, articleCount: 0, status: 1, sort: 0 },
    ],
    articles: [
      { articleCode: 'a1', title: '文章1', status: 'DRAFT', sort: 0 },
    ],
  }),
}));

describe('treeStore', () => {
  beforeEach(() => {
    useTreeStore.setState({
      treeData: [],
      expandedKeys: [],
      selectedKey: null,
      loadedKeys: [],
      loadingKeys: [],
      mode: 'admin',
    });
  });

  it('loadRootNodes 加载根目录', async () => {
    const store = useTreeStore.getState();
    await store.loadRootNodes();
    const state = useTreeStore.getState();
    expect(state.treeData.length).toBeGreaterThan(0);
    expect(state.treeData[0].key).toBe('folder-f1');
  });

  it('selectNode 设置 selectedKey', () => {
    const store = useTreeStore.getState();
    store.selectNode('folder-f1');
    expect(useTreeStore.getState().selectedKey).toBe('folder-f1');
  });

  it('expandFolder 未加载时调用 API', async () => {
    const store = useTreeStore.getState();
    await store.expandFolder('folder-f1');
    expect(useTreeStore.getState().loadedKeys.includes('folder-f1')).toBe(true);
  });
});
