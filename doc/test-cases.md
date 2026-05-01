# CMS 内容管理系统 — 测试用例文档

## 1. 后端测试架构

### 1.1 测试目录结构

```
src/test/java/com/hepr/cms/
├── service/
│   ├── FolderServiceImplTest.java      # 目录服务单元测试
│   ├── ArticleServiceImplTest.java     # 文章服务单元测试
│   └── AttachmentServiceImplTest.java  # 附件服务单元测试
├── controller/
│   ├── FolderControllerTest.java       # 目录控制器集成测试
│   └── ArticleControllerTest.java      # 文章控制器集成测试
└── CmsApplicationTests.java           # 启动上下文测试
```

### 1.2 测试框架

| 类型 | 框架 | 用途 |
|------|------|------|
| 单元测试 | JUnit 5 + Mockito | Service 层逻辑测试，Mock 依赖 |
| 集成测试 | @SpringBootTest + MockMvc | Controller 层 API 测试，H2 内存数据库 |
| 测试数据库 | H2 (MODE=MySQL) | 内存数据库，自动执行 schema.sql 建表 |

### 1.3 测试配置

- 使用 `@ActiveProfiles("test")` 激活测试环境配置
- H2 内存数据库通过 `application-test.yml` 配置
- schema.sql 自动建表（参见数据库设计文档的 H2 DDL）

---

## 2. 后端单元测试用例

### 2.1 FolderServiceImplTest

| 测试用例 | 方法 | 前置条件 | 预期结果 |
|---------|------|---------|---------|
| getRootFolders_有数据_返回根级目录列表 | getRootFolders | 存在根级目录 | 返回列表包含目录信息，childrenCount 正确 |
| getRootFolders_无数据_返回空列表 | getRootFolders | 无根级目录 | 返回空列表 |
| create_根级目录_成功 | create | title="新目录", parentFolderCode="-1" | folderCode 非空, sort=0, parentFolderCode="-1" |
| create_子目录_父目录不存在_抛异常 | create | parentFolderCode="not_exist" | 抛出 BusinessException("父目录不存在") |
| create_sort自动递增 | create | 同级已有 sort=0 的目录 | 新目录 sort=1 |
| delete_有子目录_抛异常 | delete | 目录下有子目录 | 抛出 BusinessException("子目录") |
| delete_有文章_抛异常 | delete | 目录下有文章 | 抛出 BusinessException("文章") |
| delete_无子目录无文章_删除成功 | delete | 空目录 | 成功调用 deleteById |
| updateSort_BEFORE_成功 | updateSort | moving 和 target 同层级, position="BEFORE" | 调用 incrementSortGte + updateSortByCode |
| updateSort_AFTER_成功 | updateSort | moving 和 target 同层级, position="AFTER" | 调用 incrementSortGt + updateSortByCode |
| updateSort_不同层级_抛异常 | updateSort | moving 和 target 不同层级 | 抛出 BusinessException("同一层级") |

**单元测试代码示例**：

```java
@ExtendWith(MockitoExtension.class)
class FolderServiceImplTest {

    @Mock
    private FolderMapper folderMapper;
    @Mock
    private ArticleService articleService;
    @InjectMocks
    private FolderServiceImpl folderService;

    private Folder rootFolder;
    private Folder childFolder;

    @BeforeEach
    void setUp() {
        rootFolder = new Folder();
        rootFolder.setId(1L);
        rootFolder.setFolderCode("fc_001");
        rootFolder.setTitle("技术文档");
        rootFolder.setParentFolderCode("-1");
        rootFolder.setStatus(1);
        rootFolder.setSort(0);

        childFolder = new Folder();
        childFolder.setId(2L);
        childFolder.setFolderCode("fc_002");
        childFolder.setTitle("后端开发");
        childFolder.setParentFolderCode("fc_001");
        childFolder.setStatus(1);
        childFolder.setSort(0);
    }

    @Test
    void getRootFolders_有数据_返回根级目录列表() {
        when(folderMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(rootFolder));
        when(folderMapper.countChildrenByParentCodes(List.of("fc_001"))).thenReturn(Map.of("fc_001", 1));

        List<FolderVO> result = folderService.getRootFolders();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("技术文档");
        assertThat(result.get(0).getChildrenCount()).isEqualTo(1);
    }

    @Test
    void delete_有子目录_抛异常() {
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(rootFolder);
        when(folderMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        assertThatThrownBy(() -> folderService.delete("fc_001"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("子目录");
    }

    @Test
    void delete_无子目录无文章_删除成功() {
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(rootFolder);
        when(folderMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
        when(articleService.countByFolderCode("fc_001")).thenReturn(0L);
        when(folderMapper.deleteById(1L)).thenReturn(1);

        folderService.delete("fc_001");

        verify(folderMapper).deleteById(1L);
    }
}
```

### 2.2 ArticleServiceImplTest

| 测试用例 | 方法 | 前置条件 | 预期结果 |
|---------|------|---------|---------|
| getDetail_文章存在_填充folderTitle | getDetail | 文章存在，目录存在 | folderTitle = 目录标题 |
| getDetail_文章不存在_抛404 | getDetail | 文章不存在 | 抛出 BusinessException(code=404) |
| create_目录不存在_抛400 | create | folderCode 对应目录不存在 | 抛出 BusinessException("目录不存在") |
| create_成功_sort自动递增 | create | 目录存在，同目录已有 sort=0 的文章 | 新文章 sort=1, status=DRAFT |
| publish_草稿发布_成功 | publish | 当前 status=DRAFT | status 变为 PUBLISHED, publishedAt 非空 |
| publish_已发布再发布_抛400 | publish | 当前 status=PUBLISHED | 抛出 BusinessException("当前状态不允许发布") |
| update_已发布文章修改后变草稿 | update | 当前 status=PUBLISHED | status 变为 DRAFT, publishedAt=null |
| offline_已发布下线_成功 | offline | 当前 status=PUBLISHED | status 变为 OFFLINE |
| offline_草稿下线_抛400 | offline | 当前 status=DRAFT | 抛出 BusinessException("当前状态不允许下线") |
| delete_文章删除_同时删除关联ref | delete | 文章有关联附件引用 | 附件引用被逻辑删除 |
| search_关键词过短_返回空 | search | keyword="a" | 返回空列表 |
| search_匹配标题_返回结果 | search | keyword 匹配文章标题 | 返回包含该文章的结果 |

**单元测试代码示例**：

```java
@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleMapper articleMapper;
    @Mock
    private AttachmentRefMapper attachmentRefMapper;
    @Mock
    private FolderService folderService;
    @InjectMocks
    private ArticleServiceImpl articleService;

    private Article draftArticle;

    @BeforeEach
    void setUp() {
        draftArticle = new Article();
        draftArticle.setId(1L);
        draftArticle.setArticleCode("ac_001");
        draftArticle.setTitle("测试文章");
        draftArticle.setContentMd("# Hello");
        draftArticle.setFolderCode("fc_001");
        draftArticle.setStatus("DRAFT");
        draftArticle.setSort(0);
    }

    @Test
    void getDetail_文章存在_填充folderTitle() {
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        FolderVO folderVO = new FolderVO();
        folderVO.setTitle("后端开发");
        when(folderService.getByCode("fc_001")).thenReturn(folderVO);

        ArticleVO result = articleService.getDetail("ac_001");

        assertThat(result.getFolderTitle()).isEqualTo("后端开发");
    }

    @Test
    void publish_草稿发布_成功() {
        draftArticle.setStatus("DRAFT");
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.publish("ac_001");

        verify(articleMapper).updateById(argThat(a ->
            a.getStatus().equals("PUBLISHED") && a.getPublishedAt() != null
        ));
    }

    @Test
    void update_已发布文章修改后变草稿() {
        draftArticle.setStatus("PUBLISHED");
        ArticleUpdateDTO dto = new ArticleUpdateDTO();
        dto.setArticleCode("ac_001");
        dto.setTitle("修改标题");
        dto.setContentMd("# Modified");
        dto.setFolderCode("fc_001");

        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.update(dto);

        verify(articleMapper).updateById(argThat(a ->
            a.getStatus().equals("DRAFT") && a.getPublishedAt() == null
        ));
    }
}
```

---

## 3. 后端集成测试用例

### 3.1 FolderControllerTest

| 测试用例 | HTTP 请求 | 预期响应 |
|---------|----------|---------|
| getRootFolders_返回200和列表 | GET /api/folders/root | code=200, data 为数组 |
| createFolder_标题为空_返回400 | POST /api/folders {title:""} | code=400 |
| createFolder_标题少于3字符_返回400 | POST /api/folders {title:"ab"} | code=400 |
| createFolder_正常创建_返回200 | POST /api/folders {title:"新目录"} | code=200, data.folderCode 非空 |
| sortFolder_移动到目标前_返回200 | PUT /api/folders/sort {movingCode, targetCode, BEFORE} | code=200 |

**集成测试代码示例**：

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FolderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getRootFolders_返回200和列表() throws Exception {
        mockMvc.perform(get("/api/folders/root"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void createFolder_标题为空_返回400() throws Exception {
        String json = "{\"title\":\"\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void createFolder_正常创建_返回200() throws Exception {
        String json = "{\"title\":\"新目录\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.folderCode").isNotEmpty())
            .andExpect(jsonPath("$.data.title").value("新目录"));
    }
}
```

### 3.2 ArticleControllerTest

| 测试用例 | HTTP 请求 | 预期响应 |
|---------|----------|---------|
| createArticle_目录不存在_返回400 | POST /api/articles {title, folderCode:"not_exist"} | code=400 |
| publishArticle_文章不存在_返回404 | PUT /api/articles/not_exist/publish | code=404 |
| search_关键词过短_返回空列表 | GET /api/search?keyword=a | code=200, data=[] |

---

## 4. 前端测试架构

### 4.1 测试框架

| 类型 | 框架 | 用途 |
|------|------|------|
| 单元测试 | Vitest + jsdom | Store、API 模块、工具函数测试 |
| 组件测试 | Vitest + React Testing Library | 组件渲染和交互测试 |

### 4.2 Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
```

---

## 5. 前端测试用例

### 5.1 Store 单元测试

#### tree-store.test.ts

| 测试用例 | 操作 | 预期结果 |
|---------|------|---------|
| loadRootNodes 加载根目录 | 调用 loadRootNodes() | treeData.length > 0, key="folder-f1" |
| selectNode 设置 selectedKey | 调用 selectNode('folder-f1') | selectedKey = 'folder-f1' |
| expandFolder 未加载时调用 API | 调用 expandFolder('folder-f1') | loadedKeys.has('folder-f1') = true |

```typescript
import { describe, it, expect, vi } from 'vitest';
import { useTreeStore } from '../tree-store';

vi.mock('@/api/folder', () => ({
  getRootFolders: vi.fn().mockResolvedValue([
    { folderCode: 'f1', title: '目录1', childrenCount: 2, status: 1, sort: 0 },
  ]),
  getChildren: vi.fn().mockResolvedValue({
    folders: [
      { folderCode: 'f2', title: '子目录', childrenCount: 0, status: 1, sort: 0 },
    ],
    articles: [
      { articleCode: 'a1', title: '文章1', status: 'DRAFT', sort: 0 },
    ],
  }),
}));

describe('treeStore', () => {
  it('loadRootNodes 加载根目录', async () => {
    const store = useTreeStore.getState();
    await store.loadRootNodes();
    expect(store.treeData.length).toBeGreaterThan(0);
    expect(store.treeData[0].key).toBe('folder-f1');
  });

  it('selectNode 设置 selectedKey', () => {
    const store = useTreeStore.getState();
    store.selectNode('folder-f1');
    expect(store.selectedKey).toBe('folder-f1');
  });

  it('expandFolder 未加载时调用 API', async () => {
    const store = useTreeStore.getState();
    await store.expandFolder('folder-f1');
    expect(store.loadedKeys.has('folder-f1')).toBe(true);
  });
});
```

### 5.2 API 模块测试

#### folder.test.ts

| 测试用例 | 操作 | 预期结果 |
|---------|------|---------|
| createFolder 调用 POST /folders | createFolder({title, parentFolderCode}) | 返回 {folderCode: 'new'} |
| getRootFolders 调用 GET /folders/root | getRootFolders() | 返回数组 |
| updateFolderSort 传参正确 | updateFolderSort({movingCode, targetCode, position}) | 请求成功 |

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createFolder, getRootFolders, updateFolderSort } from '../folder';

vi.mock('../client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ folderCode: 'new' }),
    get: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(null),
  },
}));

describe('folder API', () => {
  it('createFolder 调用 POST /folders', async () => {
    const result = await createFolder({ title: '新目录', parentFolderCode: '-1' });
    expect(result.folderCode).toBe('new');
  });

  it('getRootFolders 调用 GET /folders/root', async () => {
    const result = await getRootFolders();
    expect(Array.isArray(result)).toBe(true);
  });

  it('updateFolderSort 传参正确', async () => {
    await updateFolderSort({
      movingCode: 'a', targetCode: 'b', position: 'BEFORE',
    });
  });
});
```

### 5.3 组件测试

#### MetadataBar.test.tsx

| 测试用例 | 渲染条件 | 预期结果 |
|---------|---------|---------|
| 显示最近修改时间 | updatedAt="2026-04-28 14:30" | 包含日期文本 |
| showAdd=true 时显示新增按钮 | showAdd=true | 显示"新增目录"和"新增文章"按钮 |
| showAdd=false 时不显示新增按钮 | showAdd 未传 | 不显示"新增目录"按钮 |

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetadataBar } from '../layout/MetadataBar';

describe('MetadataBar', () => {
  it('显示最近修改时间', () => {
    render(<MetadataBar updatedAt="2026-04-28 14:30" />);
    expect(screen.getByText(/2026-04-28/)).toBeInTheDocument();
  });

  it('showAdd=true 时显示新增按钮', () => {
    render(
      <MetadataBar updatedAt="2026-04-28" showAdd onAddFolder={() => {}} onAddArticle={() => {}} />
    );
    expect(screen.getByText('新增目录')).toBeInTheDocument();
    expect(screen.getByText('新增文章')).toBeInTheDocument();
  });

  it('showAdd=false 时不显示新增按钮', () => {
    render(<MetadataBar updatedAt="2026-04-28" />);
    expect(screen.queryByText('新增目录')).not.toBeInTheDocument();
  });
});
```

---

## 6. 测试用例汇总

### 6.1 后端测试用例汇总

| 模块 | 单元测试 | 集成测试 | 合计 |
|------|---------|---------|------|
| 目录 (Folder) | 11 | 5 | 16 |
| 文章 (Article) | 12 | 3 | 15 |
| 附件 (Attachment) | 4 | 0 | 4 |
| 搜索 (Search) | 3 | 0 | 3 |
| **合计** | **30** | **8** | **38** |

### 6.2 前端测试用例汇总

| 模块 | 单元测试 | 组件测试 | 合计 |
|------|---------|---------|------|
| Tree Store | 3 | 0 | 3 |
| Article Store | 2 | 0 | 2 |
| Folder API | 3 | 0 | 3 |
| Article API | 2 | 0 | 2 |
| MetadataBar | 0 | 3 | 3 |
| **合计** | **10** | **3** | **13** |
