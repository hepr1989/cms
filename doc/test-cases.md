# CMS 内容管理系统 — 测试验证用例

## 1. 通用说明

**测试范围**：集成测试（API 级别）+ 端到端验证（UI 级别），不包含单元测试。

**前置条件**：
- 后端服务已启动（默认端口 8080）
- 数据库已初始化（schema-h2.sql + data.sql）
- 前端开发服务器已启动（默认端口 5173）或已构建部署

**默认账号**：
| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | Admin@123 | ADMIN |

---

## 2. 认证模块

### 2.1 登录

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| A-01 | 正确登录 | `POST /api/auth/login` body: `{"username":"admin","password":"Admin@123"}` | 200，data 包含 token、username、role=ADMIN |
| A-02 | 密码错误 | `POST /api/auth/login` body: `{"username":"admin","password":"wrong"}` | 401，message 含"用户名或密码错误" |
| A-03 | 用户不存在 | `POST /api/auth/login` body: `{"username":"nouser","password":"Test@123"}` | 401，message 含"用户名或密码错误" |
| A-04 | 禁用账号登录 | 先禁用用户，再用该用户登录 | 401，message 含"账号已被禁用" |
| A-05 | 用户名为空 | `POST /api/auth/login` body: `{"username":"","password":"Admin@123"}` | 400，参数校验失败 |

### 2.2 获取当前用户

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| A-06 | 携带有效 Token | `GET /api/auth/me` Header: `Authorization: Bearer {token}` | 200，返回 username、role、status |
| A-07 | 不携带 Token | `GET /api/auth/me` 无 Authorization 头 | 200，data 为 null（GET 放行但不解析到用户） |

### 2.3 Token 机制

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| A-08 | 写操作无 Token | `POST /api/folders` 无 Authorization 头 | 401，message 含"未授权" |
| A-09 | 写操作 Token 过期 | 使用过期 Token 调用 `PUT /api/articles` | 401，Token 无效 |
| A-10 | Token 滑动刷新 | 使用剩余有效期 < 1 天的 Token 执行写操作 | 200，响应头包含 `X-New-Token` |
| A-11 | GET 请求无需 Token | `GET /api/folders/root` 无 Authorization 头 | 200，正常返回数据 |

---

## 3. 用户管理

### 3.1 用户 CRUD

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| U-01 | 查询用户列表 | `GET /api/users`（Admin Token） | 200，data 为用户数组，包含 admin |
| U-02 | 非 Admin 查询用户 | `GET /api/users`（普通用户 Token） | 403，"无权限" |
| U-03 | 创建用户 | `POST /api/users` body: `{"username":"testuser","password":"Test@1234","role":"USER"}` | 200，返回 UserVO |
| U-04 | 用户名重复 | 再次创建同名用户 | 400，"用户名已存在" |
| U-05 | 密码不合规-缺少大写 | `POST /api/users` password: `test@1234` | 400，密码复杂度校验失败 |
| U-06 | 密码不合规-缺少数字 | `POST /api/users` password: `Test@abcd` | 400，密码复杂度校验失败 |
| U-07 | 密码不合规-缺少特殊字符 | `POST /api/users` password: `Test12345` | 400，密码复杂度校验失败 |
| U-08 | 密码不合规-长度不足 | `POST /api/users` password: `T@1` | 400，密码复杂度校验失败 |
| U-09 | 更新用户角色 | `PUT /api/users` body: `{"username":"testuser","role":"ADMIN","status":1}` | 200，角色已更新 |
| U-10 | 禁用用户 | `PUT /api/users` body: `{"username":"testuser","role":"USER","status":0}` | 200，status 已更新 |
| U-11 | 删除普通用户 | `DELETE /api/users/testuser` | 200，username 变为 `testuser_del_{timestamp}` |
| U-12 | 删除 admin 账号 | `DELETE /api/users/admin` | 400，"不能删除管理员账号" |

### 3.2 密码管理

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| U-13 | Admin 重置密码 | `PUT /api/users/{username}/password` body: `{"newPassword":"New@1234"}` | 200 |
| U-14 | 用户自行修改密码 | `PUT /api/users/{username}/password` body: `{"oldPassword":"...","newPassword":"New@1234"}` | 200 |
| U-15 | 旧密码错误 | 修改密码时 oldPassword 填错 | 400，"旧密码错误" |
| U-16 | 新密码不合规 | newPassword: `123` | 400，密码复杂度校验失败 |

---

## 4. 目录管理

### 4.1 查询

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| F-01 | 获取根目录 | `GET /api/folders/root` | 200，返回 status=1 的根目录列表 |
| F-02 | 获取根目录-前台模式 | `GET /api/folders/root?portalMode=true` | 200，仅包含有已发布文章的目录 |
| F-03 | 获取子节点 | `GET /api/folders/{folderCode}/children` | 200，data 包含 folders 和 articles 数组 |
| F-04 | 获取子节点-前台模式 | `GET /api/folders/{folderCode}/children?portalMode=true` | 200，仅包含 status=1 目录和 PUBLISHED 文章 |
| F-05 | 获取目录详情 | `GET /api/folders/{folderCode}` | 200，返回含 childrenCount、articleCount、createdBy、updatedBy 的 FolderVO |
| F-06 | 获取所有目录 | `GET /api/folders/all` | 200，返回所有目录的平铺列表 |
| F-07 | 目录不存在 | `GET /api/folders/999999` | 404 |

### 4.2 新增

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| F-08 | 创建根目录 | `POST /api/folders` body: `{"title":"新栏目","description":"描述"}` | 200，folderCode 为雪花ID，parentFolderCode="-1" |
| F-09 | 创建子目录 | `POST /api/folders` body: `{"title":"子栏目","parentFolderCode":"{parentCode}"}` | 200，parentFolderCode 为指定值 |
| F-10 | 标题为空 | `POST /api/folders` body: `{"title":""}` | 400，"标题不能为空" |
| F-11 | 标题过短 | `POST /api/folders` body: `{"title":"ab"}` | 400，"标题长度必须在3到255个字符之间" |
| F-12 | 父目录不存在 | `POST /api/folders` body: `{"title":"test","parentFolderCode":"999999"}` | 400，"父目录不存在" |
| F-13 | sort 自动计算 | 创建第 N 个同级目录 | sort = 同级最大 sort + 1 |

### 4.3 修改

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| F-14 | 修改目录信息 | `PUT /api/folders` body: `{"folderCode":"...","title":"新标题","status":1}` | 200，信息已更新 |
| F-15 | 修改不存在目录 | `PUT /api/folders` body: `{"folderCode":"999999","title":"test","status":1}` | 404 |

### 4.4 删除

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| F-16 | 删除空目录 | `DELETE /api/folders/{空目录Code}` | 200，物理删除成功 |
| F-17 | 删除有子目录 | `DELETE /api/folders/{有子目录Code}` | 400，"目录下存在子目录，无法删除" |
| F-18 | 删除有文章目录 | `DELETE /api/folders/{有文章Code}` | 400，"目录下存在文章，无法删除" |
| F-19 | 删除不存在目录 | `DELETE /api/folders/999999` | 404 |

### 4.5 排序与移动

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| F-20 | 同层排序-BEFORE | `PUT /api/folders/sort` body: `{movingCode,targetCode,position:"BEFORE"}` | 200，顺序已调整 |
| F-21 | 同层排序-AFTER | `PUT /api/folders/sort` body: `{movingCode,targetCode,position:"AFTER"}` | 200，顺序已调整 |
| F-22 | 跨层排序 | 不同父目录下的两个目录排序 | 400，"只能在同一层级内排序" |
| F-23 | 移动目录 | `PUT /api/folders/move` 指定新父目录 | 200，目录已移动 |
| F-24 | 移动到自身 | targetParentFolderCode = folderCode | 400，"不能移动到自身目录下" |
| F-25 | 移动到子目录 | targetParentFolderCode 是自身的后代 | 400，"不能移动到自身子目录下" |

---

## 5. 文章管理

### 5.1 查询

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| AR-01 | 获取文章详情 | `GET /api/articles/{articleCode}` | 200，包含 contentMd、folderTitle、versionNumber |
| AR-02 | 文章不存在 | `GET /api/articles/999999` | 404 |

### 5.2 新增

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| AR-03 | 创建文章 | `POST /api/articles` body: `{"title":"新文章","contentMd":"# 内容","folderCode":"..."}` | 200，status=DRAFT，publishedAt=null |
| AR-04 | 标题为空 | `POST /api/articles` body: `{"title":"","folderCode":"..."}` | 400 |
| AR-05 | 目录不存在 | `POST /api/articles` body: `{"title":"test","folderCode":"999999"}` | 400 |
| AR-06 | sort 自动计算 | 在同目录创建第 N 篇文章 | sort = 同目录最大 sort + 1 |

### 5.3 修改与状态流转

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| AR-07 | 修改草稿文章 | `PUT /api/articles` 修改草稿文章内容 | 200，内容已更新，status 仍为 DRAFT |
| AR-08 | 修改已发布文章 | `PUT /api/articles` 修改 PUBLISHED 文章 | 200，**status 自动变为 DRAFT**，publishedAt 清空 |
| AR-09 | 发布文章 | `PUT /api/articles/{code}/publish`（DRAFT 状态） | 200，status=PUBLISHED，publishedAt 设置 |
| AR-10 | 重复发布 | `PUT /api/articles/{code}/publish`（已是 PUBLISHED） | 400，"当前状态不允许发布" |
| AR-11 | 下线文章 | `PUT /api/articles/{code}/offline`（PUBLISHED 状态） | 200，status=OFFLINE |
| AR-12 | 草稿下线 | `PUT /api/articles/{code}/offline`（DRAFT 状态） | 400，"当前状态不允许下线" |
| AR-13 | OFFLINE 重编辑 | `PUT /api/articles` 修改 OFFLINE 文章 | 200，status 变为 DRAFT |

### 5.4 删除

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| AR-14 | 删除文章 | `DELETE /api/articles/{articleCode}` | 200，文章及版本历史被删除，attachment_ref 逻辑删除 |
| AR-15 | 删除不存在文章 | `DELETE /api/articles/999999` | 404 |

### 5.5 排序与移动

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| AR-16 | 同目录排序 | `PUT /api/articles/sort` 同目录两篇文章 | 200，顺序已调整 |
| AR-17 | 跨目录排序 | `PUT /api/articles/sort` 不同目录两篇文章 | 400，"只能在同一目录内排序" |
| AR-18 | 移动文章 | `PUT /api/articles/move` 指定新目录 | 200，文章已移动到新目录 |
| AR-19 | 移动到不存在目录 | targetFolderCode 不存在 | 400 |

### 5.6 PDF 导入

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| AR-20 | 导入 PDF | `POST /api/articles/import-pdf` multipart: file + folderCode | 200，status=DRAFT，contentMd 包含提取的文本 |
| AR-21 | 导入非 PDF | 上传 .txt 文件 | 400 或 500，提示文件格式不支持 |

---

## 6. 附件管理

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| AT-01 | 上传文件 | `POST /api/attachments/upload` multipart: file + refType + refCode | 200，返回 attachmentCode、fileUrl、downloadUrl |
| AT-02 | 上传超大文件 | 上传 > 10MB 文件 | 413，"文件大小不能超过10MB" |
| AT-03 | 查询附件 | `GET /api/attachments/{attachmentCode}` | 200，返回附件信息 |
| AT-04 | 附件不存在 | `GET /api/attachments/999999` | 404 |
| AT-05 | 下载附件 | `GET /api/attachments/{attachmentCode}/download` | 200，文件流，Content-Disposition 含 UTF-8 编码文件名 |
| AT-06 | 下载不存在附件 | `GET /api/attachments/999999/download` | 404 |
| AT-07 | 按关联查询 | `GET /api/attachments/query?refType=article&refCode={code}` | 200，返回关联附件列表 |
| AT-08 | 删除附件 | `DELETE /api/attachments/{attachmentCode}` | 200，物理文件删除，attachment 和 attachment_ref 逻辑删除 |
| AT-09 | 存储路径格式 | 上传文件后检查 fileUrl | 格式为 `/uploads/yyyy-MM/{uuid}.{ext}` |

---

## 7. 搜索模块

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| S-01 | 关键词搜索 | `GET /api/search?keyword=Spring` | 200，返回匹配文章列表，含 contentSnippet |
| S-02 | 前台搜索 | `GET /api/search?keyword=Spring&portalMode=true` | 200，仅返回 PUBLISHED 文章 |
| S-03 | 后台搜索 | `GET /api/search?keyword=Spring&portalMode=false` | 200，返回所有状态文章 |
| S-04 | 关键词过短 | `GET /api/search?keyword=S`（1 个字符） | 200，返回空列表 |
| S-05 | 结果上限 | 搜索匹配 > 50 条的关键词 | 最多返回 50 条 |
| S-06 | contentSnippet | 搜索结果中 contentSnippet | 匹配位置前后各 50 个字符，用 `...` 标识截断 |
| S-07 | folderTitle 填充 | 搜索结果中 folderTitle | 通过 FolderService 查询填充 |

---

## 8. 栏目权限

### 8.1 权限操作

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| P-01 | 查询用户权限 | `GET /api/folder-permissions?username=testuser`（Admin） | 200，返回该用户的权限列表 |
| P-02 | 非 Admin 查询他人权限 | `GET /api/folder-permissions?username=xxx`（普通用户） | 403 |
| P-03 | 查询自身权限 | `GET /api/folder-permissions/mine`（普通用户） | 200，返回自身的栏目权限 |
| P-04 | 授权 | `POST /api/folder-permissions/grant` body: `{username,folderCode}` | 200，自动级联授权子栏目 |
| P-05 | 撤销 | `POST /api/folder-permissions/revoke` body: `{username,folderCode}` | 200，自动级联撤销子栏目 |
| P-06 | 批量更新 | `POST /api/folder-permissions/batch` body: `{username,grantCodes,revokeCodes}` | 200，一次完成所有变更 |

### 8.2 权限级联

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| P-07 | 授权父栏目级联 | 授予某用户父栏目权限 | 该用户自动获得所有子栏目权限 |
| P-08 | 撤销父栏目级联 | 撤销某用户父栏目权限 | 该用户所有子栏目权限同步撤销 |

### 8.3 权限控制效果

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| P-09 | 无权限编辑文章 | 普通用户无对应栏目权限，调用写操作 | 403，"无编辑权限" |
| P-10 | Admin 跳过校验 | Admin 用户编辑任意栏目文章 | 200，正常操作 |
| P-11 | 有权限编辑 | 普通用户有对应栏目权限，编辑文章 | 200，正常操作 |

---

## 9. 版本管理

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| V-01 | 自动创建版本 | 编辑已存在的文章并保存 | 保存前的内容自动归档为新版本 |
| V-02 | 版本号自增 | 多次保存同一文章 | 版本号从 1 开始，每次 +1 |
| V-03 | 获取版本列表 | `GET /api/articles/{code}/versions` | 200，返回版本数组，含 versionNumber、status、title、createdBy、createdAt |
| V-04 | 获取版本详情 | `GET /api/articles/{code}/versions/{num}` | 200，返回完整 contentMd |
| V-05 | 版本不存在 | `GET /api/articles/{code}/versions/999` | 404，"版本不存在" |
| V-06 | 删除文章级联 | 删除一篇文章 | 该文章的版本历史同步删除 |

---

## 10. 前端路由与页面

### 10.1 路由守卫

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| R-01 | 根路径重定向 | 访问 `/` | 重定向到 `/portal` |
| R-02 | 未登录访问 Admin | 无 Token 时访问 `/admin` | 重定向到 `/login` |
| R-03 | 已登录访问登录页 | 有 Token 时访问 `/login` | 重定向到 `/admin` |
| R-04 | Portal 匿名访问 | 无 Token 访问 `/portal` | 正常展示前台页面 |
| R-05 | SPA 404 | 访问不存在的路由如 `/abc` | 前端展示 404 页面或 index.html |

### 10.2 前台页面

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| R-06 | 前台目录树 | 访问 `/portal` | 仅显示 status=1 的目录，仅显示 PUBLISHED 文章 |
| R-07 | 前台文章阅读 | 点击前台文章链接 | Markdown 渲染展示，含大纲导航 |
| R-08 | 前台搜索 | 在前台搜索框输入关键词 | 仅搜索到 PUBLISHED 文章 |

### 10.3 后台页面

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| R-09 | 后台目录树 | 登录后访问 `/admin` | 显示所有状态目录，包含 DRAFT 文章 |
| R-10 | 文章编辑页 | 点击后台文章链接 | Markdown 编辑器，元数据栏显示"修改人" |
| R-11 | 用户管理页 | 访问 `/admin/users` | 展示用户列表，支持增删改查 |
| R-12 | 权限配置页 | 访问 `/admin/permissions` | 展示非 Admin 用户列表 + 栏目树 checkbox |
| R-13 | 权限配置过滤 | 权限配置页用户列表 | Admin 用户不显示在列表中 |

### 10.4 认证交互

| # | 用例 | 操作 | 预期结果 |
|---|------|------|----------|
| R-14 | 登录流程 | 在登录页输入正确凭证 | 跳转到 `/admin`，Token 存入 localStorage |
| R-15 | 登出流程 | 点击登出按钮 | 清除 Token，跳转到 `/login` |
| R-16 | Token 自动刷新 | 前端请求收到 X-New-Token 响应头 | 自动更新 localStorage 中的 Token |
| R-17 | 401 自动登出 | 前端请求收到 401 响应 | 自动清除 Token，跳转到 `/login` |

---

## 11. 综合场景

| # | 用例 | 操作步骤 | 预期结果 |
|---|------|----------|----------|
| E-01 | 完整文章生命周期 | 1. 创建文章 → 2. 编辑 → 3. 发布 → 4. 编辑(自动变草稿) → 5. 重新发布 → 6. 下线 → 7. 删除 | 每步状态正确流转，版本号递增 |
| E-02 | 目录嵌套操作 | 1. 创建根目录 → 2. 创建子目录 → 3. 子目录创建文章 → 4. 尝试删除根目录 → 5. 删除文章 → 6. 删除子目录 → 7. 删除根目录 | 步骤4失败(有子目录)，步骤7成功 |
| E-03 | 权限完整流程 | 1. Admin 创建普通用户 → 2. 授予栏目权限 → 3. 用户编辑文章 → 4. 撤销权限 → 5. 用户再编辑 | 步骤3成功，步骤5返回403 |
| E-04 | 附件上传关联 | 1. 上传附件关联文章 → 2. 查询文章附件列表 → 3. 下载附件 → 4. 删除附件 → 5. 再查询 | 步骤2有数据，步骤5为空 |
| E-05 | 前后台数据隔离 | 1. 后台创建草稿文章 → 2. 切换到前台 | 前台看不到草稿文章 |
| E-06 | 搜索与权限 | 1. 创建草稿文章 → 2. 前台搜索 → 3. 后台搜索 | 前台搜不到，后台能搜到 |
| E-07 | 版本回滚查看 | 1. 创建文章 → 2. 多次编辑保存 → 3. 查看版本列表 → 4. 查看某版本详情 | 版本数量与保存次数一致，内容正确 |
| E-08 | PDF 导入完整流程 | 1. 导入 PDF → 2. 查看生成的文章 → 3. 检查附件 | 文章包含提取文本，图片作为附件关联 |

---

## 12. 验证检查清单

### 12.1 后端 API 验证

- [ ] 所有 GET 接口无需 Token 可访问
- [ ] 所有 POST/PUT/DELETE 接口无 Token 返回 401
- [ ] 非 Admin 用户调用管理接口返回 403
- [ ] 雪花算法生成的编码（folderCode/articleCode/attachmentCode）格式正确
- [ ] 审计字段（createdBy/updatedBy）自动填充
- [ ] 时间格式统一为 `yyyy-MM-dd HH:mm:ss`
- [ ] 错误响应统一 Result 结构

### 12.2 前端交互验证

- [ ] 目录树懒加载：首次只加载根节点，展开时加载子节点
- [ ] 已加载节点缓存，不重复请求
- [ ] 拖拽排序后列表顺序与后端一致
- [ ] 文章编辑器 Markdown 实时预览
- [ ] 元数据栏显示"修改人"而非"分享按钮"
- [ ] 前台/后台模式切换时目录树重新加载

### 12.3 数据安全验证

- [ ] 密码 BCrypt 加密存储（数据库明文不可逆）
- [ ] JWT Token 通过 `Authorization: Bearer` 传递
- [ ] 文件大小限制 10MB 生效
- [ ] 附件存储路径格式 `yyyy-MM/{uuid}.{ext}` 正确
- [ ] 下载文件名 UTF-8 编码正确
