# CMS 内容管理系统 — 部署运维文档

## 1. 部署架构

CMS 系统采用前后端单体部署方式，前端构建产物打包到 Spring Boot 的 static 目录中，通过一个 JAR 文件提供服务。

```
┌──────────────────────────────────────────────┐
│              cms-0.0.1-SNAPSHOT.jar           │
│  ┌──────────────────────────────────────────┐ │
│  │         Spring Boot (port 8080)          │ │
│  │  ┌─────────┐  ┌───────────────────────┐ │ │
│  │  │ REST API│  │  Static Resources     │ │ │
│  │  │ /api/** │  │  /index.html + assets │ │ │
│  │  └─────────┘  └───────────────────────┘ │ │
│  └──────────────────────────────────────────┘ │
│  ┌─────────────┐  ┌────────────────────────┐ │
│  │   MySQL      │  │  本地文件存储           │ │
│  │   (cms库)    │  │  ./uploads/            │ │
│  └─────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────┘
```

## 2. 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| JDK | 17+ | 必须，Spring Boot 3.2.5 要求 |
| Maven | 3.8+ | 后端构建 |
| Node.js | 18+ | 前端构建 |
| MySQL | 8.0+ | 数据库 |
| MinIO（可选） | 最新 | 附件对象存储，本地存储模式不需要 |

## 3. 构建部署流程

### 3.1 完整构建（前端+后端）

```bash
# 1. 构建前端
cd cms-web
npm install
npm run build

# 2. 拷贝前端产物到后端 static 目录
# Windows:
xcopy /E /Y dist\* ..\src\main\resources\static\
# Linux/Mac:
# cp -r dist/* ../src/main/resources/static/

# 3. 构建后端 JAR
cd ..
mvn clean package -DskipTests

# 4. 运行
java -jar target/cms-0.0.1-SNAPSHOT.jar
```

### 3.2 仅后端构建

```bash
mvn clean package
java -jar target/cms-0.0.1-SNAPSHOT.jar
```

### 3.3 仅前端开发

```bash
cd cms-web
npm install
npm run dev
# 访问 http://localhost:5173，Vite 代理 API 请求到 localhost:8080
```

## 4. 环境配置

### 4.1 开发环境 (dev)

激活方式：`--spring.profiles.active=dev` 或默认

```yaml
# application-dev.yml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
logging:
  level:
    com.hepr.cms: DEBUG
```

特性：
- 启用 CORS（允许 localhost:5173/3000 跨域访问）
- MyBatis SQL 日志输出到控制台
- DEBUG 级别日志

### 4.2 生产环境 (prod)

激活方式：`--spring.profiles.active=prod`

特性：
- 不启用 CORS（前后端同源）
- 不输出 SQL 日志
- INFO 级别日志

### 4.3 测试环境 (test)

激活方式：`@ActiveProfiles("test")`（集成测试自动使用）

特性：
- 使用 H2 内存数据库
- 自动执行 schema.sql 建表
- MODE=MySQL 兼容 MySQL 语法

## 5. 数据库初始化

### 5.1 首次部署

```bash
# 连接 MySQL
mysql -u root -p123456

# 执行建库建表脚本
source db/schema.sql
```

或手动执行 DDL（详见数据库设计文档）。

### 5.2 数据库连接配置

```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/cms?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: 123456
```

生产环境建议通过环境变量覆盖敏感配置：

```bash
java -jar target/cms-0.0.1-SNAPSHOT.jar \
  --spring.datasource.username=$DB_USER \
  --spring.datasource.password=$DB_PASSWORD
```

## 6. 附件存储配置

### 6.1 本地存储（默认）

```yaml
cms:
  storage:
    type: local
    local:
      base-path: ./uploads
      allowed-extensions: jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,md,zip
```

特性：
- 文件存储在 `{base-path}/yyyy-MM/{uuid}.{ext}`
- 通过 `/uploads/**` URL 访问
- WebMvcConfig 配置静态资源映射

目录结构：
```
./uploads/
├── 2026-04/
│   ├── a1b2c3d4-5678-90ab-cdef-1234567890ab.png
│   └── e5f6g7h8-1234-5678-abcd-ef0123456789.pdf
└── 2026-05/
    └── ...
```

### 6.2 MinIO 存储

```yaml
cms:
  storage:
    type: minio
    minio:
      endpoint: http://localhost:9000
      access-key: minioadmin
      secret-key: minioadmin
      bucket: cms
```

切换方式：修改 `cms.storage.type` 为 `minio`。

特性：
- `@ConditionalOnProperty` 自动切换 StorageService 实现
- MinioConfig 自动创建 MinioClient Bean
- 上传时自动创建 bucket（如不存在）
- 文件访问 URL 使用预签名方式（7天有效期）

### 6.3 存储切换注意事项

| 切换方向 | 注意事项 |
|---------|---------|
| local → minio | 已有的本地文件不会自动迁移，需手动上传到 MinIO；数据库中的 file_url 和 storage_key 需更新 |
| minio → local | MinIO 中的文件需手动下载到本地 uploads 目录 |

建议：首次部署时确定存储方式，避免后续切换。

## 7. SPA Fallback 配置

### 7.1 实现原理

Spring Boot WebMvcConfig 中注册 ErrorPageRegistrar：

```java
@Bean
public ErrorPageRegistrar errorPageRegistrar() {
    return registry -> registry.addErrorPage(new ErrorPage(
        HttpStatus.NOT_FOUND, "/index.html"));
}
```

### 7.2 路由规则

| URL 模式 | 处理方式 |
|---------|---------|
| `/api/**` | Spring Boot Controller 处理 |
| `/uploads/**` | 静态资源映射到本地文件系统 |
| `/assets/**`, `/index.html`, etc. | 前端静态资源 |
| 其他路径 (如 `/admin/folder/xxx`) | 404 → 转发到 `/index.html` → React Router 处理 |

### 7.3 验证方式

```bash
# 启动后验证
curl http://localhost:8080/                    # 返回 index.html
curl http://localhost:8080/admin               # 返回 index.html（SPA Fallback）
curl http://localhost:8080/portal/article/123  # 返回 index.html（SPA Fallback）
curl http://localhost:8080/api/folders/root    # 返回 JSON 数据
```

## 8. 运维操作

### 8.1 启动

```bash
# 前台启动
java -jar target/cms-0.0.1-SNAPSHOT.jar

# 后台启动
nohup java -jar target/cms-0.0.1-SNAPSHOT.jar > cms.log 2>&1 &

# 指定环境
java -jar target/cms-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

### 8.2 停止

```bash
# 查找进程
ps aux | grep cms

# 优雅停止
kill -15 <PID>
```

### 8.3 日志

```bash
# 实时查看日志
tail -f cms.log

# 查看错误日志
grep -i error cms.log
```

### 8.4 健康检查

```bash
# 检查服务是否运行
curl http://localhost:8080/api/folders/root

# 预期返回
{"code":200,"message":"ok","data":[...]}
```

## 9. 部署后验证

### 9.1 后端 API 验证

启动 Spring Boot 后，通过 curl 或 Postman 逐接口验证：

**目录模块**：

| 验证项 | 操作 | 预期结果 |
|-------|------|---------|
| 根级目录列表 | `GET /api/folders/root` | 返回 code=200，data 为数组 |
| 子目录懒加载 | `GET /api/folders/{code}/children` | 返回 folders + articles |
| 新增目录 | `POST /api/folders {title, parentFolderCode}` | folderCode 为雪花ID，sort 自动计算 |
| 修改目录 | `PUT /api/folders {folderCode, title, ...}` | 更新成功 |
| 删除空目录 | `DELETE /api/folders/{code}` | 成功，code=200 |
| 删除非空目录 | `DELETE /api/folders/{非空code}` | 失败，code=400，提示"目录非空" |
| 目录排序 | `PUT /api/folders/sort {movingCode, targetCode, position}` | 成功，sort 值更新 |

**文章模块**：

| 验证项 | 操作 | 预期结果 |
|-------|------|---------|
| 新增文章 | `POST /api/articles {title, folderCode}` | status=DRAFT，articleCode 为雪花ID |
| 文章详情 | `GET /api/articles/{code}` | 返回完整 contentMd，含 folderTitle |
| 修改已发布文章 | `PUT /api/articles {articleCode, ...}` | 自动变为 DRAFT，publishedAt 被清空 |
| 发布文章 | `PUT /api/articles/{code}/publish` | status=PUBLISHED，publishedAt 非空 |
| 下线文章 | `PUT /api/articles/{code}/offline` | status=OFFLINE |
| 删除文章 | `DELETE /api/articles/{code}` | 成功，关联 attachment_ref 同步删除 |
| 文章排序 | `PUT /api/articles/sort {movingCode, targetCode, position}` | 成功 |

**附件模块**：

| 验证项 | 操作 | 预期结果 |
|-------|------|---------|
| 上传文件 | `POST /api/attachments/upload (multipart)` | 返回 attachmentCode + fileUrl |
| 查询附件 | `GET /api/attachments/{code}` | 返回附件信息 |
| 按关联查询 | `GET /api/attachments/query?refType=article&refCode=xxx` | 返回该文章的附件列表 |
| 删除附件 | `DELETE /api/attachments/{code}` | 物理文件 + 数据库记录均删除 |

**搜索模块**：

| 验证项 | 操作 | 预期结果 |
|-------|------|---------|
| 关键词匹配标题 | `GET /api/search?keyword=Spring` | 返回标题含"Spring"的文章 |
| 关键词匹配内容 | `GET /api/search?keyword=配置` | 返回内容含"配置"的文章，含 contentSnippet |
| portalMode 过滤 | `GET /api/search?keyword=xxx&portalMode=true` | 仅返回 PUBLISHED 状态文章 |

### 9.2 前端功能验证

`npm run dev` 启动开发服务器后，逐项验证：

| 验证项 | 操作 | 预期结果 |
|-------|------|---------|
| 布局渲染 | 访问 http://localhost:5173 | HeaderBar + Sidebar + ContentArea 正常显示 |
| 搜索功能 | 在搜索框输入关键词 | 300ms 防抖后出现下拉结果，点击跳转 |
| 树懒加载 | 初始仅加载根级目录 | 展开某目录加载子节点，收起再展开不重新请求 |
| 目录 CRUD | 新增/编辑/删除目录 | 弹窗操作正常，树节点实时刷新 |
| 文章编辑 | 选中文章 → 修改内容 → 保存 | Markdown 编辑器正常，图片上传插入语法 |
| 大纲导航 | 编辑长文章 | 右侧大纲随标题变化，点击滚动定位 |
| 附件管理 | 上传/删除附件 | 附件列表实时更新 |
| 状态流转 | 新建→发布→编辑→变草稿→重新发布 | ArticleStatusBadge 颜色正确切换 |
| 拖拽排序 | 同层级内拖拽目录/文章 | 排序成功，跨层级被阻止 |
| 前台展示 | 访问 /portal | 仅显示 PUBLISHED 文章 + 正常目录，无操作按钮 |
| 元数据栏 | 查看任意内容页 | 底部显示"最近修改"时间 + 分享按钮 |

### 9.3 集成验证

前后端合并部署后的端到端验证：

```bash
# 1. 构建前端并拷贝到后端
cd cms-web && npm run build && xcopy /E /Y dist\* ..\src\main\resources\static\

# 2. 打包后端
cd .. && mvn clean package

# 3. 运行
java -jar target/cms-0.0.1-SNAPSHOT.jar

# 4. 访问 http://localhost:8080
```

| 验证项 | 操作 | 预期结果 |
|-------|------|---------|
| 首页访问 | 访问 / | 重定向到 /portal |
| SPA 路由 | 直接访问 /admin/folder/xxx | 不返回 404，正常渲染页面 |
| API 代理 | 前端调用 /api/* | 正确转发到后端 Controller |
| 附件访问 | 访问 /uploads/2026-04/xxx.png | 返回图片文件 |

### 9.4 响应式验证

使用浏览器 DevTools 切换设备尺寸：

| 验证项 | 断点 | 预期行为 |
|-------|------|---------|
| Desktop 布局 | ≥ 1024px | Sidebar 280px 常驻，编辑器分屏模式 |
| Tablet 布局 | 768-1023px | Sidebar 覆盖层模式，编辑器纯编辑模式 |
| Mobile 布局 | < 768px | 汉堡菜单触发 Sidebar，搜索框收缩，编辑器标签页模式 |
| 树节点交互 | Mobile | 点击展开/选中，无 hover 操作按钮 |

## 10. 常见问题

### Q1: 前端页面刷新 404

**原因**：SPA Fallback 未生效。

**解决**：确认 WebMvcConfig 中的 ErrorPageRegistrar 已正确注册，且 static 目录下存在 index.html。

### Q2: 附件上传后无法访问

**原因**：静态资源映射未配置或路径不对。

**解决**：
1. 确认 `cms.storage.local.base-path` 配置正确
2. 确认 WebMvcConfig 中 `/uploads/**` 映射到 `file:{base-path}/`
3. 确认 uploads 目录有读写权限

### Q3: MinIO 连接失败

**原因**：MinIO 服务未启动或配置不正确。

**解决**：
1. 确认 MinIO 服务已启动：`curl http://localhost:9000/minio/health/live`
2. 确认 access-key 和 secret-key 正确
3. 确认 `cms.storage.type=minio` 已配置

### Q4: 数据库连接失败

**原因**：MySQL 未启动或连接信息错误。

**解决**：
1. 确认 MySQL 服务已启动
2. 确认 cms 数据库已创建
3. 确认用户名密码正确
4. 确认时区配置 `serverTimezone=Asia/Shanghai`

### Q5: 开发环境 CORS 报错

**原因**：CorsConfig 仅在 dev profile 下生效。

**解决**：确认启动时激活了 dev profile，或检查 `--spring.profiles.active=dev` 是否传入。
