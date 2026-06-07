# CMS 用户认证 + 栏目权限 + 版本管理 功能文档

## 1. 功能概述

在原有 CMS 内容管理系统基础上，新增三大功能模块：

| 模块 | 说明 |
|------|------|
| 用户认证 | JWT Token 认证，支持登录/登出/密码修改，区分管理员与普通用户 |
| 栏目权限 | 管理员为用户分配栏目编辑权限，权限级联到子栏目，批量操作 |
| 版本管理 | 文章每次保存自动创建版本快照，支持历史版本查看和回滚 |

---

## 2. 用户认证模块

### 2.1 用户模型

| 字段 | 说明 |
|------|------|
| username | 用户名，唯一 |
| password | BCrypt 加密存储 |
| role | 角色：ADMIN / USER |

### 2.2 认证流程

- 登录接口接收用户名和密码，校验通过后签发 JWT Token
- Token 通过 HTTP Header `Authorization: Bearer {token}` 传递
- 后端拦截器解析 Token，将用户信息存入 ThreadLocal 上下文
- 密码复杂度要求：至少 8 位，包含大小写字母和数字

### 2.3 接口设计

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 登录，返回 Token |
| /api/auth/me | GET | 获取当前用户信息 |
| /api/auth/change-password | PUT | 修改密码 |
| /api/users | GET | 用户列表（管理员） |
| /api/users | POST | 创建用户（管理员） |
| /api/users/{username} | DELETE | 删除用户（管理员） |
| /api/users/{username}/reset-password | POST | 重置密码（管理员） |

### 2.4 前端路由守卫

- Admin 页面需登录后才能访问，未登录自动跳转登录页
- Portal 页面无需登录，可匿名访问
- 前端使用 Zustand 管理认证状态，Token 存储在 localStorage

---

## 3. 栏目权限模块

### 3.1 权限模型

| 字段 | 说明 |
|------|------|
| username | 被授权用户名 |
| folder_code | 栏目编码 |

唯一索引：`(username, folder_code)`，物理删除（不使用软删除，避免唯一索引冲突）。

### 3.2 权限级联规则

- 授予某栏目权限时，自动级联授予其所有子栏目
- 撤销某栏目权限时，自动级联撤销其所有子栏目
- 管理员（ADMIN 角色）拥有全部权限，无需单独配置

### 3.3 权限配置页面

- 管理员可为指定用户勾选/取消栏目权限
- 支持树形展示栏目层级，复选框勾选
- 所有变更在一次批量 API 调用中提交，避免 N+1 请求

### 3.4 接口设计

| 接口 | 方法 | 说明 | 权限 |
|------|------|------|------|
| /api/folder-permissions?username= | GET | 查询用户权限列表 | 管理员 |
| /api/folder-permissions/mine | GET | 查询当前用户权限 | 登录用户 |
| /api/folder-permissions/batch | POST | 批量更新权限（grant + revoke） | 管理员 |

### 3.5 前端权限控制

- **栏目树**：普通用户仅显示有权限的栏目
- **文章编辑页**：无权限时保存/发布/下线/删除按钮隐藏，编辑器只读
- **栏目详情页**：无权限时隐藏新建文章按钮
- **权限查询**：普通用户通过 `/mine` 接口获取自身权限，避免 403

### 3.6 后端权限拦截

- 文章增删改接口统一校验当前用户是否拥有目标栏目权限
- 管理员角色跳过权限校验

---

## 4. 版本管理模块

### 4.1 版本模型

| 字段 | 说明 |
|------|------|
| article_code | 所属文章编码 |
| version_number | 版本号（自增） |
| title | 版本快照时的标题 |
| content_md | 版本快照时的内容 |
| created_by | 创建人 |
| created_at | 创建时间 |

### 4.2 版本创建规则

- 文章每次保存（update）时，自动将保存前的内容创建为新版本
- 版本号自增，从 1 开始
- 版本记录不可修改，仅支持查询和删除

### 4.3 接口设计

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/articles/{articleCode}/versions | GET | 获取版本列表 |
| /api/articles/{articleCode}/versions/{versionNumber} | GET | 获取版本详情 |
| /api/articles/{articleCode}/versions/{versionNumber}/restore | POST | 回滚到指定版本 |

### 4.4 前端版本面板

- 文章编辑页右侧展示版本历史列表
- 点击版本号可查看该版本内容（只读对比）
- 支持将历史版本内容恢复到当前编辑器

---

## 5. 性能优化策略

### 5.1 后端优化

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 权限级联（授予/撤销） | 递归查询 DB 获取子栏目 | 一次查全表 + 内存 childrenMap 遍历 |
| 权限批量插入 | 循环逐条 INSERT | 单条批量 INSERT SQL |
| 搜索时填充栏目名称 | 循环逐条查询 folder | 一次查全表 + 内存 Map |
| 目录移动循环引用检查 | 递归查询 DB | 一次查全表 + 内存 childrenMap 遍历 |

核心原则：**禁止循环内 DB 查询和循环内 DB 写入**，统一改为一次查询 + 内存计算。

### 5.2 前端优化

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| F5 刷新后树展开定位 | 递归加载全树 N 个 API | getAllFoldersFlat 一次 + 内存父链 + 仅加载路径上 3-4 个节点 |
| 权限配置勾选提交 | N+1 次单独 API 调用 | 单次批量 API 调用 |
| 拖拽后刷新根节点 | 可能重复调用 refreshRootNodes | 合并去重，仅调用一次 |
| 树展开状态闭包问题 | useCallback 捕获旧 expandedKeys | 使用 getState() 读取实时状态 |

---

## 6. 数据库表结构

### 6.1 cms_user

| 列名 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| username | VARCHAR(50) UNIQUE | 用户名 |
| password | VARCHAR(100) | BCrypt 加密密码 |
| role | VARCHAR(20) | 角色 ADMIN/USER |
| created_by | VARCHAR(50) | 创建人 |
| created_at | DATETIME | 创建时间 |
| updated_by | VARCHAR(50) | 修改人 |
| updated_at | DATETIME | 修改时间 |
| del_flag | TINYINT | 逻辑删除标志 |

### 6.2 cms_folder_permission

| 列名 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| username | VARCHAR(50) | 用户名 |
| folder_code | VARCHAR(50) | 栏目编码 |
| created_by | VARCHAR(50) | 创建人 |
| created_at | DATETIME | 创建时间 |
| updated_by | VARCHAR(50) | 修改人 |
| updated_at | DATETIME | 修改时间 |

唯一索引：`uk_username_folder (username, folder_code)`

### 6.3 cms_article_version

| 列名 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| article_code | VARCHAR(50) | 文章编码 |
| version_number | INT | 版本号 |
| title | VARCHAR(255) | 版本快照标题 |
| content_md | LONGTEXT | 版本快照内容 |
| created_by | VARCHAR(50) | 创建人 |
| created_at | DATETIME | 创建时间 |

索引：`idx_article_version (article_code, version_number)`

---

## 7. 审计字段自动填充

### 7.1 填充策略

| 字段 | 插入时 | 更新时 |
|------|--------|--------|
| created_by | 当前登录用户 | - |
| created_at | 当前时间 | - |
| updated_by | 当前登录用户 | **强制覆盖**为当前登录用户 |
| updated_at | 当前时间 | **强制覆盖**为当前时间 |

更新时使用强制覆盖（`setFieldValByName`），避免 `strictUpdateFill` 在字段已有值时跳过填充。

---

## 8. Portal 页面特殊处理

| 处理项 | 说明 |
|--------|------|
| 隐藏登录信息 | Portal 页面 Header 不显示用户名和退出登录按钮 |
| 只读访问 | Portal 页面所有内容为只读，无编辑操作 |
| 栏目修改信息 | 栏目详情页底部展示最近修改人和修改时间 |
