# CMS 内容管理系统 — 需求文档

## 1. 项目概述

从零搭建一个内容管理系统（CMS），供内部人员维护和查阅文章。系统分为后台管理页面（Admin）和前台展示页面（Portal），通过前端路由区分，无需鉴权。工作空间 `d:\hepr\workspace\cms`。

## 2. 环境约定

| 项目 | 约定 |
|------|------|
| 数据库 | MySQL（库名 cms，root/123456） |
| 附件存储 | 仅本地存储 |
| 部署方式 | 前后端单体部署 |
| 后端技术栈 | Java 17 + Spring Boot 3.2.5 + MyBatis-Plus 3.5.6 + Maven |
| 前端技术栈 | React 18 + TypeScript + Vite + Ant Design + Zustand |

## 3. 编码策略

- **主键 id**：使用数据库自增（`AUTO_INCREMENT`）
- **业务编码字段**（folder_code、article_code、attachment_code）：统一使用雪花算法生成（`IdWorker.getIdStr()`）
- **附件关联表的 ref_code**：不是独立生成的编码，而是引用关联实体的编码值（如文章的 article_code），ref_type 标识关联类型（如 "article"）
- **查询构造器**：强制使用 `LambdaQueryWrapper`，不使用字符串形式的 QueryWrapper
- **标题校验**：使用 `@Length(min = 3)` 注解，不使用 `@Size`
- **统一响应**：使用 `Result<T>`，不使用 `R<T>`
- **根目录标识**：`parentFolderCode = '-1'` 表示根级目录
- **创建人/更新人默认值**：`created_by`/`updated_by` 默认 `'system'`
- **文章正文**：`content_md` 使用 `LONGTEXT` 类型
- **排序自动计算**：创建时 sort = 同级最大 sort + 1，前端无需传 sort 值
- **DDD 聚合根边界**：Folder 和 Article 是独立聚合根，跨聚合根调用通过 Service 接口（不直接依赖 Mapper），使用 `@Lazy` 打破循环依赖
- **附件/附件引用**：是 Article 聚合根的值对象

## 4. 功能需求

### 4.1 目录管理

| 功能 | 说明 |
|------|------|
| 查看根级目录 | 获取 `parentFolderCode = '-1'` 且 `status = 1` 的根级目录列表 |
| 懒加载子节点 | 展开目录时加载子目录和文章，支持 portalMode 过滤 |
| 新增目录 | 雪花算法生成 folderCode，sort 自动计算，支持创建根级和子目录 |
| 修改目录 | 修改标题、描述、状态，不允许移动目录（修改 parentFolderCode） |
| 删除目录 | 仅允许删除空目录（无子目录、无文章），逻辑删除 |
| 拖拽排序 | 同层级内拖拽排序，movingCode + targetCode + position（BEFORE/AFTER） |

### 4.2 文章管理

| 功能 | 说明 |
|------|------|
| 查看文章详情 | 返回完整 contentMd，填充 folderTitle |
| 新增文章 | 雪花算法生成 articleCode，默认 DRAFT 状态，sort 自动计算 |
| 修改文章 | 修改标题、内容、所属目录；**已发布文章修改后自动变为草稿** |
| 发布文章 | DRAFT → PUBLISHED，设置 publishedAt |
| 下线文章 | PUBLISHED → OFFLINE |
| 删除文章 | 逻辑删除，同时删除关联的 attachment_ref 记录 |
| 拖拽排序 | 同目录内拖拽排序，与目录排序逻辑一致 |

### 4.3 附件管理

| 功能 | 说明 |
|------|------|
| 上传文件 | 最大 10MB，本地存储路径格式 yyyy-MM/{uuid}.{ext} |
| 查询附件 | 根据 attachmentCode 查询单个附件 |
| 按关联查询 | 根据 refType + refCode 查询关联的附件列表 |
| 删除附件 | 同时删除物理文件、逻辑删除 attachment 记录和关联的 attachment_ref 记录 |

### 4.4 搜索

| 功能 | 说明 |
|------|------|
| 全文搜索 | 匹配文章标题和内容（LIKE 模糊匹配），最少 2 个字符，最多 50 条结果 |
| 内容片段 | 匹配位置前后各截取 50 个字符，用 `...` 标识截断 |
| 模式过滤 | portalMode=true 时仅搜索 PUBLISHED 文章 |

### 4.5 前台展示

| 功能 | 说明 |
|------|------|
| 目录浏览 | 仅展示 status=1 的目录和 PUBLISHED 文章 |
| 文章阅读 | Markdown 渲染展示，含大纲导航 |
| 搜索 | 与管理端共用搜索接口，默认 portalMode=true |

## 5. 文章状态流转

```
  ┌───────┐  publish   ┌───────────┐  offline  ┌─────────┐
  │ DRAFT │ ────────→  │ PUBLISHED │ ────────→ │ OFFLINE │
  └───────┘            └───────────┘           └─────────┘       ↑
     ↑                      │                       │             │
     │                      │ edit (自动变DRAFT)     │  re-edit    │
     │                      ↓                       └─────────────┘
     └──────────────────────┘
```

**状态流转规则**：

| 当前状态 | 允许操作 | 目标状态 | 触发方式 |
|---------|---------|---------|---------|
| DRAFT | 发布 | PUBLISHED | 手动发布 |
| PUBLISHED | 下线 | OFFLINE | 手动下线 |
| PUBLISHED | 编辑 | DRAFT | 修改文章内容后自动触发 |
| OFFLINE | 重新编辑 | DRAFT | 手动操作 |

**禁止的流转**：
- PUBLISHED → PUBLISHED（重复发布）
- DRAFT → OFFLINE（草稿不可直接下线）

## 6. 布局参考

文档风格布局：
- 固定顶部导航栏（Logo + 搜索框 + 菜单切换）
- 左侧可折叠嵌套导航树
- 右侧内容区（目录索引/文章详情）
- 底部元数据栏
- 简洁明亮主题

## 7. 非功能需求

| 项目 | 要求 |
|------|------|
| 响应式 | 支持 Desktop / Tablet / Mobile 三种断点 |
| 懒加载 | 目录树按需加载子节点，已加载的缓存 |
| 排序稳定性 | 拖拽排序通过 SQL 实现，不在 Java 中操作列表 |
| 存储可切换 | 支持本地存储和 MinIO，通过配置切换 |
| 单体部署 | 前端构建产物放入 Spring Boot static 目录 |
