# CMS 内容管理系统 — API 接口文档

## 1. 通用说明

**Base Path**: `/api`

**统一响应结构** `Result<T>`:

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码，200=成功，400=参数错误，404=资源不存在，413=文件过大，500=系统异常 |
| message | string | 提示信息 |
| data | T | 业务数据，失败时为 null |

**通用错误码**:

| code | message | 触发场景 |
|------|---------|----------|
| 400 | 参数校验失败信息 | @Valid 校验不通过、业务规则不满足 |
| 404 | 资源不存在 | 查询的目录/文章/附件编码不存在 |
| 413 | 文件大小超过限制 | 上传文件 > 10MB |
| 500 | 系统异常，请联系管理员 | 未捕获异常 |

---

## 2. 目录模块 `/api/folders`

### 2.1 获取根级目录列表

```
GET /api/folders/root
```

**请求参数**: 无

**响应** `Result<List<FolderVO>>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "folderCode": "1893274912345",
      "title": "技术文档",
      "parentFolderCode": "-1",
      "status": 1,
      "description": "技术相关文档",
      "sort": 0,
      "childrenCount": 3,
      "createdAt": "2026-04-28 10:00:00",
      "updatedAt": "2026-04-28 10:00:00"
    }
  ]
}
```

**说明**: 仅返回 `parentFolderCode = '-1'` 且 `status = 1` 的根级目录，按 sort ASC 排序。`childrenCount` 为子目录数量（不含文章），用于前端判断树节点是否显示展开箭头。

---

### 2.2 获取子目录和文章（懒加载）

```
GET /api/folders/{folderCode}/children
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| folderCode | string | 是 | 目录编码 |

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| portalMode | boolean | 否 | false | true=前台模式（仅返回PUBLISHED文章+status=1目录） |

**响应** `Result<FolderTreeVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "folders": [
      {
        "folderCode": "1893274912346",
        "title": "后端开发",
        "parentFolderCode": "1893274912345",
        "status": 1,
        "description": "",
        "sort": 0,
        "childrenCount": 2,
        "createdAt": "2026-04-28 10:05:00",
        "updatedAt": "2026-04-28 10:05:00"
      }
    ],
    "articles": [
      {
        "articleCode": "1893274912350",
        "title": "Spring Boot 入门",
        "contentMd": null,
        "folderCode": "1893274912345",
        "status": "PUBLISHED",
        "publishedAt": "2026-04-28 11:00:00",
        "sort": 0,
        "folderTitle": null,
        "createdAt": "2026-04-28 10:30:00",
        "updatedAt": "2026-04-28 11:00:00"
      }
    ]
  }
}
```

**说明**: 返回指定目录下的直接子目录和直接文章，均按 sort ASC 排序。列表中文章的 `contentMd` 始终为 null（不传输正文），`folderTitle` 在此接口中不填充。

---

### 2.3 新增目录

```
POST /api/folders
```

**请求体** `FolderCreateDTO` (JSON):

| 字段 | 类型 | 必填 | 校验 | 说明 |
|------|------|------|------|------|
| title | string | 是 | @NotBlank, @Length(min=3, max=255) | 目录标题 |
| parentFolderCode | string | 否 | — | 父目录编码，不传或传"-1"表示根级目录 |
| description | string | 否 | @Length(max=512) | 描述 |

**请求示例**:

```json
{
  "title": "新目录名称",
  "parentFolderCode": "1893274912345",
  "description": "目录描述信息"
}
```

**响应** `Result<FolderVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "folderCode": "1893274912999",
    "title": "新目录名称",
    "parentFolderCode": "1893274912345",
    "status": 1,
    "description": "目录描述信息",
    "sort": 3,
    "childrenCount": null,
    "createdAt": "2026-04-28 14:00:00",
    "updatedAt": "2026-04-28 14:00:00"
  }
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 400 | 标题不能为空 | title 为空 |
| 400 | 标题长度必须在3到255个字符之间 | title 长度 < 3 或 > 255 |
| 400 | 父目录不存在或已不可用 | parentFolderCode 对应的目录不存在或 status=0 |

**说明**: `folderCode` 由后端雪花算法生成；`sort` 由后端自动计算（同级最大sort+1）；新建目录默认 `status=1`。

---

### 2.4 修改目录

```
PUT /api/folders
```

**请求体** `FolderUpdateDTO` (JSON):

| 字段 | 类型 | 必填 | 校验 | 说明 |
|------|------|------|------|------|
| folderCode | string | 是 | @NotBlank | 目录编码 |
| title | string | 是 | @NotBlank, @Length(min=3, max=255) | 目录标题 |
| description | string | 否 | @Length(max=512) | 描述 |
| status | int | 是 | @NotNull | 状态：1-正常，0-不可用 |

**请求示例**:

```json
{
  "folderCode": "1893274912999",
  "title": "修改后的标题",
  "description": "修改后的描述",
  "status": 1
}
```

**响应** `Result<FolderVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "folderCode": "1893274912999",
    "title": "修改后的标题",
    "parentFolderCode": "1893274912345",
    "status": 1,
    "description": "修改后的描述",
    "sort": 3,
    "childrenCount": null,
    "createdAt": "2026-04-28 14:00:00",
    "updatedAt": "2026-04-28 15:00:00"
  }
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 目录不存在 | folderCode 对应的目录不存在 |

**说明**: 不允许修改 `parentFolderCode`（移动目录需单独接口，暂不实现）。

---

### 2.5 删除目录

```
DELETE /api/folders/{folderCode}
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| folderCode | string | 是 | 目录编码 |

**响应** `Result<Void>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 目录不存在 | folderCode 对应的目录不存在 |
| 400 | 目录下存在子目录，无法删除 | 该目录下有 status=1 的子目录 |
| 400 | 目录下存在文章，无法删除 | 该目录下有未删除的文章 |

**说明**: 仅允许删除空目录（无子目录、无文章）。执行逻辑删除（del_flag 设为 1）。

---

### 2.6 目录拖拽排序

```
PUT /api/folders/sort
```

**请求体** `FolderSortDTO` (JSON):

| 字段 | 类型 | 必填 | 校验 | 说明 |
|------|------|------|------|------|
| movingCode | string | 是 | @NotBlank | 被拖拽的目录编码 |
| targetCode | string | 是 | @NotBlank | 目标位置参考目录编码 |
| position | string | 是 | @NotBlank | 位置："BEFORE"=拖到目标前面，"AFTER"=拖到目标后面 |

**请求示例**:

```json
{
  "movingCode": "1893274912999",
  "targetCode": "1893274912346",
  "position": "BEFORE"
}
```

**响应** `Result<Void>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 目录不存在 | movingCode 或 targetCode 对应的目录不存在 |
| 400 | 只能在同一层级内排序 | 两个目录不在同一父目录下 |

**说明**: 排序通过 SQL 实现（incrementSortGte/Gt + updateSortByCode，共2条UPDATE），不在 Java 中操作列表。

---

## 3. 文章模块 `/api/articles`

### 3.1 获取文章详情

```
GET /api/articles/{articleCode}
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| articleCode | string | 是 | 文章编码 |

**响应** `Result<ArticleVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "articleCode": "1893274912350",
    "title": "Spring Boot 入门",
    "contentMd": "# Spring Boot 入门\n\n这是正文内容...",
    "folderCode": "1893274912345",
    "status": "PUBLISHED",
    "publishedAt": "2026-04-28 11:00:00",
    "sort": 0,
    "folderTitle": "技术文档",
    "createdAt": "2026-04-28 10:30:00",
    "updatedAt": "2026-04-28 11:00:00"
  }
}
```

**说明**: 详情接口返回完整 `contentMd`，并填充 `folderTitle`（所属目录标题）。

---

### 3.2 新增文章

```
POST /api/articles
```

**请求体** `ArticleCreateDTO` (JSON):

| 字段 | 类型 | 必填 | 校验 | 说明 |
|------|------|------|------|------|
| title | string | 是 | @NotBlank, @Length(min=3, max=255) | 文章标题 |
| contentMd | string | 否 | — | Markdown正文 |
| folderCode | string | 是 | @NotBlank | 所属目录编码 |

**请求示例**:

```json
{
  "title": "新文章标题",
  "contentMd": "# 标题\n\n正文内容",
  "folderCode": "1893274912345"
}
```

**响应** `Result<ArticleVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "articleCode": "1893274913000",
    "title": "新文章标题",
    "contentMd": "# 标题\n\n正文内容",
    "folderCode": "1893274912345",
    "status": "DRAFT",
    "publishedAt": null,
    "sort": 1,
    "folderTitle": null,
    "createdAt": "2026-04-28 16:00:00",
    "updatedAt": "2026-04-28 16:00:00"
  }
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 400 | 所属目录不存在或已不可用 | folderCode 对应的目录不存在或 status=0 |

**说明**: 新建文章默认 `status=DRAFT`、`publishedAt=null`；`articleCode` 由后端雪花算法生成；`sort` 由后端自动计算（同目录最大sort+1）。

---

### 3.3 修改文章

```
PUT /api/articles
```

**请求体** `ArticleUpdateDTO` (JSON):

| 字段 | 类型 | 必填 | 校验 | 说明 |
|------|------|------|------|------|
| articleCode | string | 是 | @NotBlank | 文章编码 |
| title | string | 是 | @NotBlank, @Length(min=3, max=255) | 文章标题 |
| contentMd | string | 否 | — | Markdown正文 |
| folderCode | string | 是 | @NotBlank | 所属目录编码 |

**请求示例**:

```json
{
  "articleCode": "1893274913000",
  "title": "修改后的标题",
  "contentMd": "# 修改\n\n修改后内容",
  "folderCode": "1893274912345"
}
```

**响应** `Result<ArticleVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "articleCode": "1893274913000",
    "title": "修改后的标题",
    "contentMd": "# 修改\n\n修改后内容",
    "folderCode": "1893274912345",
    "status": "DRAFT",
    "publishedAt": null,
    "sort": 1,
    "folderTitle": null,
    "createdAt": "2026-04-28 16:00:00",
    "updatedAt": "2026-04-28 17:00:00"
  }
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 文章不存在 | articleCode 对应的文章不存在 |

**重要行为**: 如果文章当前状态为 `PUBLISHED`，修改后自动变为 `DRAFT`（需重新发布），同时 `publishedAt` 被清空。这是核心业务规则——已发布文章修改后必须重新审核发布。

---

### 3.4 发布文章

```
PUT /api/articles/{articleCode}/publish
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| articleCode | string | 是 | 文章编码 |

**响应** `Result<Void>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 文章不存在 | articleCode 对应的文章不存在 |
| 400 | 当前状态不允许发布，状态：PUBLISHED | 当前已是 PUBLISHED 状态 |

**允许的状态流转**: DRAFT → PUBLISHED、OFFLINE → PUBLISHED。发布后 `publishedAt` 设为当前时间。

---

### 3.5 下线文章

```
PUT /api/articles/{articleCode}/offline
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| articleCode | string | 是 | 文章编码 |

**响应** `Result<Void>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 文章不存在 | articleCode 对应的文章不存在 |
| 400 | 当前状态不允许下线，状态：DRAFT | 当前不是 PUBLISHED 状态 |

**允许的状态流转**: PUBLISHED → OFFLINE。下线后文章在前台不可见。

---

### 3.6 删除文章

```
DELETE /api/articles/{articleCode}
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| articleCode | string | 是 | 文章编码 |

**响应** `Result<Void>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 文章不存在 | articleCode 对应的文章不存在 |

**说明**: 执行逻辑删除（del_flag=1），同时逻辑删除该文章关联的所有 `cms_attachment_ref` 记录。物理文件和 `cms_attachment` 记录不会被删除（附件独立管理）。

---

### 3.7 文章拖拽排序

```
PUT /api/articles/sort
```

**请求体** `ArticleSortDTO` (JSON):

| 字段 | 类型 | 必填 | 校验 | 说明 |
|------|------|------|------|------|
| movingCode | string | 是 | @NotBlank | 被拖拽的文章编码 |
| targetCode | string | 是 | @NotBlank | 目标位置参考文章编码 |
| position | string | 是 | @NotBlank | 位置："BEFORE"=拖到目标前面，"AFTER"=拖到目标后面 |

**请求示例**:

```json
{
  "movingCode": "1893274913000",
  "targetCode": "1893274912350",
  "position": "AFTER"
}
```

**响应** `Result<Void>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 文章不存在 | movingCode 或 targetCode 对应的文章不存在 |
| 400 | 只能在同一目录内排序 | 两篇文章不在同一目录下 |

---

## 4. 附件模块 `/api/attachments`

### 4.1 上传文件

```
POST /api/attachments/upload
```

**Content-Type**: `multipart/form-data`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | MultipartFile | 是 | 上传的文件（最大10MB） |
| refType | string | 否 | 关联类型，如 "article" |
| refCode | string | 否 | 关联实体编码，如文章的 articleCode |

**请求示例** (multipart/form-data):
```
file: (binary)
refType: "article"
refCode: "1893274913000"
```

**响应** `Result<AttachmentVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "attachmentCode": "1893274914000",
    "fileName": "screenshot.png",
    "fileUrl": "/uploads/2026-04/a1b2c3d4-5678-90ab-cdef-1234567890ab.png",
    "fileSize": 102400,
    "storageType": "local"
  }
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 413 | 文件大小不能超过10MB | 文件 > 10MB |
| 500 | 文件存储失败：... | 磁盘写入异常 |

**说明**: `storageKey` 格式为 `yyyy-MM/{uuid}.{ext}`；如果同时传入 `refType` 和 `refCode`，自动创建 `cms_attachment_ref` 关联记录；`attachmentCode` 由雪花算法生成。

---

### 4.2 根据编码查询附件

```
GET /api/attachments/{attachmentCode}
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| attachmentCode | string | 是 | 附件编码 |

**响应** `Result<AttachmentVO>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "attachmentCode": "1893274914000",
    "fileName": "screenshot.png",
    "fileUrl": "/uploads/2026-04/a1b2c3d4.png",
    "fileSize": 102400,
    "storageType": "local"
  }
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 附件不存在 | attachmentCode 对应的附件不存在 |

---

### 4.3 删除附件

```
DELETE /api/attachments/{attachmentCode}
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| attachmentCode | string | 是 | 附件编码 |

**响应** `Result<Void>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

**错误场景**:

| code | message | 触发条件 |
|------|---------|----------|
| 404 | 附件不存在 | attachmentCode 对应的附件不存在 |

**说明**: 同时删除物理文件、逻辑删除 `cms_attachment` 记录、逻辑删除所有 `cms_attachment_ref` 中 `attachment_code` 匹配的关联记录。

---

### 4.4 按关联查询附件列表

```
GET /api/attachments/query
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refType | string | 是 | 关联类型，如 "article" |
| refCode | string | 是 | 关联实体编码，如文章的 articleCode |

**请求示例**: `GET /api/attachments/query?refType=article&refCode=1893274913000`

**响应** `Result<List<AttachmentVO>>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "attachmentCode": "1893274914000",
      "fileName": "screenshot.png",
      "fileUrl": "/uploads/2026-04/a1b2c3d4.png",
      "fileSize": 102400,
      "storageType": "local"
    },
    {
      "attachmentCode": "1893274914001",
      "fileName": "data.xlsx",
      "fileUrl": "/uploads/2026-04/e5f6g7h8.xlsx",
      "fileSize": 204800,
      "storageType": "local"
    }
  ]
}
```

**说明**: 先查 `cms_attachment_ref` 获取 `attachmentCode` 列表，再批量查 `cms_attachment` 获取详细信息。

---

## 5. 搜索模块 `/api/search`

### 5.1 全文搜索

```
GET /api/search
```

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 是 | — | 搜索关键词（最少2个字符） |
| portalMode | boolean | 否 | true | true=仅搜索PUBLISHED文章，false=搜索所有文章 |

**请求示例**: `GET /api/search?keyword=Spring&portalMode=true`

**响应** `Result<List<SearchResultVO>>`:

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "articleCode": "1893274912350",
      "title": "Spring Boot 入门",
      "folderCode": "1893274912345",
      "folderTitle": "技术文档",
      "status": "PUBLISHED",
      "publishedAt": "2026-04-28 11:00:00",
      "contentSnippet": "...使用Spring Boot可以快速搭建...Spring框架提供了..."
    }
  ]
}
```

**说明**:
- 关键词不足2个字符时返回空列表（不报错）
- 搜索匹配 `title` 和 `content_md` 两个字段（LIKE 模糊匹配）
- `contentSnippet` 为匹配位置前后各截取50个字符的内容片段，用 `...` 标识截断
- 最多返回50条结果
- `folderTitle` 通过 FolderService 跨聚合根查询填充

---

## 6. 文章状态流转图

```
  ┌───────┐  publish   ┌───────────┐  offline  ┌─────────┐
  │ DRAFT │ ────────→  │ PUBLISHED │ ────────→ │ OFFLINE │
  └───────┘            └───────────┘           └─────────┘       ↑
     ↑                      │                       │             │
     │                      │ edit (自动变DRAFT)     │  re-edit    │
     │                      ↓                       └─────────────┘
     └──────────────────────┘
```

**状态流转规则**:

| 当前状态 | 允许操作 | 目标状态 | 触发方式 |
|---------|---------|---------|---------|
| DRAFT | 发布 | PUBLISHED | 手动发布 |
| PUBLISHED | 下线 | OFFLINE | 手动下线 |
| PUBLISHED | 编辑 | DRAFT | 修改文章内容后自动触发 |
| OFFLINE | 重新编辑 | DRAFT | 手动操作 |

**禁止的流转**：
- PUBLISHED → PUBLISHED（重复发布）
- DRAFT → OFFLINE（草稿不可直接下线）
