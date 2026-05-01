# CMS 内容管理系统 — 前端设计文档

## 1. 依赖

```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6.23",
    "antd": "^5.16",
    "@ant-design/icons": "^5.3",
    "axios": "^1.7",
    "zustand": "^4.5",
    "@uiw/react-md-editor": "^4.0",
    "react-markdown": "^9.0",
    "remark-gfm": "^4.0",
    "rehype-highlight": "^10.0"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "@types/react": "^18.3",
    "@types/react-dom": "^18.3",
    "vite": "^5.2",
    "@vitejs/plugin-react": "^4.3",
    "eslint": "^8.57",
    "vitest": "^1.6",
    "@testing-library/react": "^16.0",
    "@testing-library/jest-dom": "^6.4",
    "@testing-library/user-event": "^14.5",
    "jsdom": "^24.0"
  }
}
```

## 2. 目录结构

```
cms-web/src/
├── main.tsx, App.tsx
├── types/
│   ├── api.ts                 # ApiResponse<T>, PageResult<T>
│   ├── folder.ts              # FolderVO, FolderTreeVO, FolderCreateDTO, FolderUpdateDTO
│   ├── article.ts             # ArticleVO, ArticleStatus, ArticleCreateDTO, ArticleUpdateDTO
│   ├── attachment.ts          # AttachmentVO
│   ├── search.ts              # SearchResultVO
│   └── tree.ts                # TreeNodeType, TreeDataNode
├── api/
│   ├── client.ts              # Axios 实例 + 拦截器
│   ├── folder.ts              # 目录 API
│   ├── article.ts             # 文章 API
│   ├── attachment.ts          # 附件 API
│   └── search.ts              # 搜索 API
├── store/
│   ├── tree-store.ts          # 树状态管理（Zustand）
│   ├── article-store.ts       # 文章编辑器状态
│   ├── ui-store.ts            # 侧边栏折叠、弹窗状态
│   └── search-store.ts        # 搜索状态
├── hooks/
│   ├── use-tree.ts            # 树懒加载+缓存逻辑
│   ├── use-article.ts         # 文章 CRUD
│   ├── use-responsive.ts      # 断点检测 { isMobile, isTablet, isDesktop }
│   └── use-search.ts          # 搜索防抖+结果
├── router/
│   ├── index.tsx              # 路由定义
│   ├── admin-routes.tsx       # Admin 路由
│   └── portal-routes.tsx      # Portal 路由
├── components/
│   ├── layout/
│   │   ├── HeaderBar.tsx      # 固定顶部：Logo + SearchInput + 菜单/管理切换
│   │   ├── Sidebar.tsx        # 左侧：FolderTree + 操作按钮
│   │   ├── ContentArea.tsx    # 右侧内容容器
│   │   ├── AdminLayout.tsx    # HeaderBar + Sidebar(可编辑) + ContentArea
│   │   └── PortalLayout.tsx   # HeaderBar + Sidebar(只读) + ContentArea
│   ├── tree/
│   │   ├── FolderTree.tsx     # Ant Design Tree + loadData 懒加载
│   │   ├── TreeNodeTitle.tsx  # 图标 + 标题 + 悬停操作按钮
│   │   └── TreeContextMenu.tsx # 右键菜单
│   ├── folder/
│   │   ├── FolderDetail.tsx           # 目录信息展示
│   │   ├── FolderFormModal.tsx        # 新增/编辑弹窗
│   │   └── FolderChildrenList.tsx     # 子目录+文章列表
│   ├── article/
│   │   ├── ArticleEditor.tsx          # 文章编辑整体布局
│   │   ├── ArticleViewer.tsx          # 文章只读查看
│   │   ├── MarkdownEditor.tsx         # @uiw/react-md-editor 封装
│   │   ├── MarkdownRenderer.tsx       # react-markdown + remark-gfm + 语法高亮
│   │   ├── ArticleOutline.tsx         # 大纲导航
│   │   ├── ImageUploadButton.tsx      # 图片上传工具栏按钮
│   │   ├── AttachmentManager.tsx      # 附件列表+上传+删除
│   │   └── ArticleStatusBadge.tsx     # DRAFT/PUBLISHED/OFFLINE 徽章
│   ├── search/
│   │   ├── SearchInput.tsx            # 搜索框+下拉结果
│   │   └── SearchResultList.tsx       # 搜索结果页
│   ├── common/
│   │   ├── MetadataBar.tsx            # 最近修改时间+分享按钮
│   │   ├── LoadingSpinner.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── ErrorBoundary.tsx
│   └── portal/
│       ├── ArticleReadView.tsx        # 前台文章阅读
│       └── FolderBrowseView.tsx       # 前台目录浏览
├── pages/
│   ├── admin/
│   │   ├── AdminPage.tsx              # 管理首页
│   │   ├── FolderViewPage.tsx         # 目录选中：右侧展示子目录+文章列表
│   │   └── ArticleEditPage.tsx        # 文章选中：右侧展示编辑器
│   └── portal/
│       ├── PortalPage.tsx             # 前台首页
│       ├── FolderBrowsePage.tsx       # 前台目录浏览
│       └── ArticleReadPage.tsx        # 前台文章阅读
├── utils/
│   ├── tree-utils.ts                  # 树操作工具
│   ├── markdown-utils.ts              # extractHeadings, generateHeadingId
│   └── constants.ts                   # 状态枚举、排序常量
└── assets/styles/
    ├── global.css                      # 全局重置+基础样式
    ├── variables.css                   # CSS 自定义属性
    └── markdown.css                    # Markdown 渲染内容样式
```

## 3. 路由配置

```
/                           → 重定向到 /portal
/portal                     → PortalLayout + PortalPage
/portal/folder/:folderCode  → PortalLayout + FolderBrowsePage
/portal/article/:articleCode → PortalLayout + ArticleReadPage
/admin                      → AdminLayout + AdminPage
/admin/folder/:folderCode   → AdminLayout + FolderViewPage
/admin/article/:articleCode → AdminLayout + ArticleEditPage
```

URL 是状态源：路由参数驱动右侧面板渲染和左侧树选中状态。

### 路由实现

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import PortalLayout from '@/components/layout/PortalLayout';
import AdminPage from '@/pages/admin/AdminPage';
import FolderViewPage from '@/pages/admin/FolderViewPage';
import ArticleEditPage from '@/pages/admin/ArticleEditPage';
import PortalPage from '@/pages/portal/PortalPage';
import FolderBrowsePage from '@/pages/portal/FolderBrowsePage';
import ArticleReadPage from '@/pages/portal/ArticleReadPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/portal" replace />,
  },
  {
    path: '/portal',
    element: <PortalLayout />,
    children: [
      { index: true, element: <PortalPage /> },
      { path: 'folder/:folderCode', element: <FolderBrowsePage /> },
      { path: 'article/:articleCode', element: <ArticleReadPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminPage /> },
      { path: 'folder/:folderCode', element: <FolderViewPage /> },
      { path: 'article/:articleCode', element: <ArticleEditPage /> },
    ],
  },
]);
```

## 4. 页面布局设计（文档风格）

```
┌──────────────────────────── HeaderBar ────────────────────────────┐
│  [Logo] CMS 知识库       [搜索框: 请输入关键词...]    [菜单] [管理] │
├─────────────┬─────────────────────────────────────────────────────┤
│  Sidebar    │  Content Area                                       │
│  (280px)    │  (flex:1, 内容区max-width:960px居中)                │
│             │                                                     │
│  FolderTree │  FolderViewPage / ArticleEditPage / ArticleReadPage │
│  (独立滚动) │  (独立滚动)                                         │
│             │                                                     │
└─────────────┴─────────────────────────────────────────────────────┘
```

**HeaderBar 细节**：
- 固定定位，z-index 最高，白色背景+底部1px边框
- 左侧：Logo + "CMS 知识库"
- 中部：SearchInput（输入300ms防抖→调搜索API→下拉结果列表）
- 右侧：[菜单]（移动端展开侧边栏）、[管理/返回前台]（根据当前模式切换）

**Sidebar 细节**：
- Desktop 280px 常驻；Tablet/Mobile 覆盖层模式
- 目录节点：文件夹图标（展开/折叠两种状态），文章节点：文档图标
- 选中节点背景浅色高亮
- Admin 模式悬停显示操作按钮；Portal 模式纯导航

**Content Area 细节**：
- 选中目录：标题+子目录列表（文件夹图标+链接）+文章列表（文档图标+链接+状态徽章）+MetadataBar
- 选中文章：返回按钮+标题+状态+Markdown内容+MetadataBar

**MetadataBar**：底部元数据栏，显示 `最近修改: {updatedAt}` + `[分享文章]` 按钮

## 5. TypeScript 类型定义

### types/api.ts

```typescript
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}
```

### types/folder.ts

```typescript
export interface FolderVO {
  folderCode: string;
  title: string;
  parentFolderCode: string;
  status: number;
  description: string;
  sort: number;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTreeVO {
  folders: FolderVO[];
  articles: ArticleVO[];
}

export interface FolderCreateDTO {
  title: string;
  parentFolderCode?: string;
  description?: string;
}

export interface FolderUpdateDTO {
  folderCode: string;
  title: string;
  description?: string;
  status: number;
}

export interface FolderSortDTO {
  movingCode: string;
  targetCode: string;
  position: 'BEFORE' | 'AFTER';
}
```

### types/article.ts

```typescript
export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OFFLINE = 'OFFLINE',
}

export interface ArticleVO {
  articleCode: string;
  title: string;
  contentMd: string | null;
  folderCode: string;
  status: ArticleStatus;
  publishedAt: string | null;
  sort: number;
  folderTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleCreateDTO {
  title: string;
  contentMd?: string;
  folderCode: string;
}

export interface ArticleUpdateDTO {
  articleCode: string;
  title: string;
  contentMd?: string;
  folderCode: string;
}

export interface ArticleSortDTO {
  movingCode: string;
  targetCode: string;
  position: 'BEFORE' | 'AFTER';
}
```

### types/attachment.ts

```typescript
export interface AttachmentVO {
  attachmentCode: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  storageType: string;
}
```

### types/search.ts

```typescript
export interface SearchResultVO {
  articleCode: string;
  title: string;
  folderCode: string;
  folderTitle: string;
  status: string;
  publishedAt: string | null;
  contentSnippet: string;
}
```

### types/tree.ts

```typescript
export type TreeNodeType = 'folder' | 'article';
export type TreeNodeKey = string;

export interface TreeDataNode {
  key: TreeNodeKey;
  title: string;
  type: TreeNodeType;
  isLeaf: boolean;
  parentKey: string;
  code: string;
  status?: number | string;
  sort?: number;
  children?: TreeDataNode[];
  hasChildren?: boolean;
}
```

## 6. API 模块实现

### api/client.ts

```typescript
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

// 响应拦截器：解包 Result<T> → T
client.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data;
    if (code !== 200) {
      return Promise.reject(new Error(message));
    }
    return data;  // 直接返回 data，调用方无需再解包
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

### api/folder.ts

```typescript
export const getRootFolders = () => client.get<FolderVO[]>('/folders/root');
export const getChildren = (folderCode: string, portalMode = false) =>
  client.get<FolderTreeVO>(`/folders/${folderCode}/children`, { params: { portalMode } });
export const createFolder = (data: FolderCreateDTO) => client.post<FolderVO>('/folders', data);
export const updateFolder = (data: FolderUpdateDTO) => client.put<FolderVO>('/folders', data);
export const deleteFolder = (folderCode: string) => client.delete(`/folders/${folderCode}`);
export const updateFolderSort = (data: FolderSortDTO) => client.put('/folders/sort', data);
```

### api/article.ts

```typescript
export const getArticle = (articleCode: string) => client.get<ArticleVO>(`/articles/${articleCode}`);
export const createArticle = (data: ArticleCreateDTO) => client.post<ArticleVO>('/articles', data);
export const updateArticle = (data: ArticleUpdateDTO) => client.put<ArticleVO>('/articles', data);
export const publishArticle = (articleCode: string) => client.put(`/articles/${articleCode}/publish`);
export const offlineArticle = (articleCode: string) => client.put(`/articles/${articleCode}/offline`);
export const deleteArticle = (articleCode: string) => client.delete(`/articles/${articleCode}`);
export const updateArticleSort = (data: ArticleSortDTO) => client.put('/articles/sort', data);
```

### api/attachment.ts

```typescript
export const uploadFile = (file: File, refType?: string, refCode?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (refType) formData.append('refType', refType);
  if (refCode) formData.append('refCode', refCode);
  return client.post<AttachmentVO>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getAttachment = (attachmentCode: string) =>
  client.get<AttachmentVO>(`/attachments/${attachmentCode}`);
export const deleteAttachment = (attachmentCode: string) =>
  client.delete(`/attachments/${attachmentCode}`);
export const getAttachmentsByRef = (refType: string, refCode: string) =>
  client.get<AttachmentVO[]>('/attachments/query', { params: { refType, refCode } });
```

### api/search.ts

```typescript
export const searchArticles = (keyword: string, portalMode = true) =>
  client.get<SearchResultVO[]>('/search', { params: { keyword, portalMode } });
```

## 7. Store 实现

### store/article-store.ts

```typescript
interface ArticleState {
  currentArticle: ArticleVO | null;
  isDirty: boolean;
  isSaving: boolean;
  originalContent: string;

  loadArticle: (articleCode: string) => Promise<void>;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  saveArticle: () => Promise<ArticleVO>;
  publishArticle: () => Promise<void>;
  offlineArticle: () => Promise<void>;
  reset: () => void;
}
```

**关键逻辑**：
- `setContent` 时对比 `originalContent` 判断 `isDirty`
- `saveArticle` 调用 updateArticle API，保存后用后端返回结果更新 currentArticle（后端可能将 PUBLISHED 改为 DRAFT）
- `publishArticle`/`offlineArticle` 调用 API 后重新 loadArticle 获取最新状态

### store/ui-store.ts

```typescript
interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;        // 'folderCreate' | 'folderEdit' | null
  modalProps: Record<string, any>;
  isMobile: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (name: string, props?: Record<string, any>) => void;
  closeModal: () => void;
  setIsMobile: (mobile: boolean) => void;
}
```

### store/search-store.ts

```typescript
interface SearchState {
  keyword: string;
  results: SearchResultVO[];
  isSearching: boolean;
  showDropdown: boolean;

  search: (keyword: string) => Promise<void>;
  clearSearch: () => void;
  setShowDropdown: (show: boolean) => void;
}
```

### store/tree-store.ts

```typescript
interface TreeState {
  treeData: TreeDataNode[];
  loadedKeys: Set<string>;
  expandedKeys: string[];
  selectedKey: string | null;
  loadingKeys: Set<string>;

  loadRootNodes: () => Promise<void>;
  loadChildren: (folderKey: string) => Promise<void>;
  expandFolder: (key: string) => void;
  collapseFolder: (key: string) => void;
  selectNode: (key: string | null) => void;
  addFolderNode: (parentKey: string, folder: FolderVO) => void;
  addArticleNode: (parentKey: string, article: ArticleVO) => void;
  removeNode: (key: string) => void;
  updateNode: (key: string, partial: Partial<TreeDataNode>) => void;
  refreshChildren: (folderKey: string) => Promise<void>;
}
```

**懒加载核心逻辑**：

```
用户点击展开箭头
  → expandFolder(key)
  → 检查 loadedKeys.has(key)
  → 如果已加载：仅更新 expandedKeys，不请求接口
  → 如果未加载：
     1. loadingKeys.add(key)，显示加载中
     2. 调用 API: GET /api/folders/{folderCode}/children?portalMode=false
     3. 将返回的 folders 和 articles 转换为 TreeDataNode[]
        - folder 节点: key="folder-{code}", isLeaf=false
        - article 节点: key="article-{code}", isLeaf=true
     4. 插入到父节点的 children 中
     5. loadedKeys.add(key)
     6. loadingKeys.delete(key)
```

**刷新机制**：添加子目录/文章后：
```
  → refreshChildren(parentKey)
  1. loadedKeys.delete(parentKey)
  2. 从树中清除该节点的 children
  3. 重新调用 loadChildren(parentKey)
```

## 8. 核心组件实现

### FolderTree.tsx

```typescript
<Tree
  treeData={treeStore.treeData}
  loadData={({ key }) => treeStore.loadChildren(key)}
  loadedKeys={[...treeStore.loadedKeys]}
  expandedKeys={treeStore.expandedKeys}
  selectedKeys={treeStore.selectedKey ? [treeStore.selectedKey] : []}
  draggable={mode === 'admin'}
  onDrop={handleDrop}
  onSelect={(keys) => treeStore.selectNode(keys[0])}
  onExpand={(keys) => treeStore.setExpandedKeys(keys)}
  titleRender={(nodeData) => <TreeNodeTitle node={nodeData} mode={mode} />}
  allowDrop={allowDrop}
/>
```

**拖拽排序 allowDrop 逻辑**：
```typescript
const allowDrop = ({ dragNode, dropNode, dropPosition }) => {
  if (dropPosition === -1) return false;  // 禁止拖入节点内部
  return dragNode.parentKey === dropNode.parentKey;  // 仅允许同层级
};
```

**onDrop 逻辑**：提取 dragNode/dropNode → 校验同层级 → 乐观更新 → 调用排序 API → 失败回滚

### MarkdownEditor.tsx

```typescript
<MDEditor
  value={articleStore.currentArticle?.contentMd || ''}
  onChange={(val) => articleStore.setContent(val || '')}
  mode={isMobile ? 'edit' : 'split'}
  preview="live"
  height="100%"
  visibleDragbar={false}
  toolbarCommands={[imageUploadCommand]}
/>
```

**图片上传自定义命令**：创建 file input → 选图 → 调上传 API → 在光标处插入 `![filename](url)`

### ArticleOutline.tsx

- 使用 `extractHeadings()` 从 contentMd 提取标题列表
- 匹配 `/^#{1,6}\s+.+$/gm`，返回 `[{ level, text, id }]`
- 为每个标题生成 `id="heading-{index}"` 用于锚点定位
- 渲染为嵌套列表，点击滚动到对应位置
- IntersectionObserver 监听可见标题，高亮当前标题

### FolderFormModal.tsx

- mode: 'create' | 'edit'
- 表单字段：title (Input), description (TextArea), status (Radio.Group, 仅编辑模式)
- 创建成功后调用 `treeStore.refreshChildren(parentFolderCode)`
- 编辑成功后调用 `treeStore.updateNode(key, { title, status })`

### ArticleEditPage.tsx

布局：
```
┌────────────────────────────────────────────────────────────────────┐
│  ← 返回        文章标题 - [草稿]    [保存] [发布] [更多▼]         │
│  ──────────────────────────────────────────────────────────────── │
│  ┌────────────────────────────────────┬──────────────────────┐    │
│  │  MarkdownEditor                    │  大纲导航             │    │
│  │  (编辑+预览 分屏)                   │  附件管理             │    │
│  └────────────────────────────────────┴──────────────────────┘    │
│  最近修改: xxx                                            [分享]  │
└────────────────────────────────────────────────────────────────────┘
```

**保存逻辑**：
1. 点击保存 → articleStore.saveArticle()
2. 如果原来是 PUBLISHED，保存后后端返回 DRAFT
3. 弹出提示："此文章已发布，保存后状态变为草稿，需重新发布"

**isDirty 路由守卫**：使用 react-router 的 useBlocker，当 isDirty 为 true 时离开页面弹出确认框

### MetadataBar.tsx

```typescript
/**
 * Props:
 *   updatedAt: string | null
 *   showShare?: boolean (默认 true)
 *   showAdd?: boolean (Admin 目录页用，默认 false)
 *   onAddFolder?: () => void
 *   onAddArticle?: () => void
 */
```

## 9. 前后端关键交互流程

### 流程1：目录树懒加载

```
1. 页面初始化
   前端: treeStore.loadRootNodes()
   → GET /api/folders/root
   → 转换为 TreeDataNode[]: [{key:"folder-xxx", isLeaf:false, hasChildren:childrenCount>0}]

2. 用户展开某个目录节点
   前端: treeStore.expandFolder("folder-xxx")
   → 检查 loadedKeys → 未加载则 GET /api/folders/xxx/children
   → folders → TreeDataNode[] (key="folder-yyy")
   → articles → TreeDataNode[] (key="article-zzz", isLeaf=true)
   → 合并插入父节点的 children，目录排文章前面
   → loadedKeys.add("folder-xxx")

3. 用户收起再展开
   → 已加载，仅更新 expandedKeys，不请求接口
```

### 流程2：新增目录后刷新树

```
用户点击"新增子目录" → FolderFormModal 打开 → 填写提交
→ POST /api/folders { title, parentFolderCode }
→ 成功后 treeStore.refreshChildren("folder-xxx")
  → loadedKeys.delete → 清除 children → 重新 loadChildren
```

### 流程3：新增文章

```
用户选中目录 → 点击"新增文章" → navigate('/admin/article/new?folderCode=xxx')
→ 编辑内容 → 点击保存
→ POST /api/articles { title, contentMd, folderCode }
→ 成功后 navigate('/admin/article/新雪花ID') + treeStore.addArticleNode
```

### 流程4：文章编辑+发布+编辑变草稿

```
1. 点击 PUBLISHED 文章 → GET /api/articles/zzz → ArticleStatusBadge 显示绿色
2. 修改内容 → isDirty=true → 显示警告："修改保存后将变为草稿"
3. 点击保存 → PUT /api/articles → 后端自动 PUBLISHED→DRAFT → 前端状态更新
4. 点击发布 → PUT /api/articles/zzz/publish → 重新 loadArticle → 状态变回 PUBLISHED
```

### 流程5：图片上传插入Markdown

```
编辑器工具栏点击图片上传 → 触发 file picker → 选择图片
→ POST /api/attachments/upload (multipart)
→ 返回 AttachmentVO { fileUrl }
→ 在光标位置插入 ![filename](fileUrl)
```

### 流程6：拖拽排序

```
用户在同层级拖拽 → onDrop 触发
→ 校验同层级 → 乐观更新 treeData
→ 调用 PUT /api/folders/sort 或 PUT /api/articles/sort
→ API 失败则回滚 treeData
```

## 10. CSS 主题规范

### assets/styles/variables.css

```css
:root {
  /* 主题色 */
  --color-primary: #1677ff;
  --color-primary-light: #e6f4ff;
  --color-primary-hover: #4096ff;

  /* 状态色 */
  --color-success: #52c41a;     /* PUBLISHED */
  --color-warning: #faad14;     /* DRAFT */
  --color-error: #ff4d4f;       /* OFFLINE */
  --color-disabled: #d9d9d9;

  /* 文字色 */
  --color-text-primary: #1f1f1f;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;

  /* 背景色 */
  --color-bg-primary: #ffffff;
  --color-bg-sidebar: #fafafa;
  --color-bg-hover: #f5f5f5;
  --color-bg-selected: #e6f4ff;

  /* 边框 */
  --color-border: #f0f0f0;
  --color-border-strong: #d9d9d9;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 字体 */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-xxl: 24px;

  /* 布局 */
  --header-height: 56px;
  --sidebar-width: 280px;
  --content-max-width: 960px;
  --border-radius: 6px;

  /* 阴影（少用，保持扁平） */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
}
```

## 11. Vite 配置

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          antd: ['antd'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-highlight'],
        },
      },
    },
  },
});
```
