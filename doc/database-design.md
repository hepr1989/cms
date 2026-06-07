# CMS 内容管理系统 — 数据库设计文档

## 1. 概述

CMS 系统共包含 7 张数据表：

| 表名 | 说明 | 主键策略 | 业务编码字段 |
|------|------|---------|------------|
| cms_folder | 目录表 | AUTO_INCREMENT | folder_code（雪花算法） |
| cms_article | 文章表 | AUTO_INCREMENT | article_code（雪花算法） |
| cms_attachment | 附件表 | AUTO_INCREMENT | attachment_code（雪花算法） |
| cms_attachment_ref | 附件关联表 | AUTO_INCREMENT | ref_code 引用关联实体编码 |
| cms_user | 用户表 | AUTO_INCREMENT | username（自然键） |
| cms_folder_permission | 栏目编辑权限表 | AUTO_INCREMENT | - |
| cms_article_version | 文章历史版本表 | AUTO_INCREMENT | - |

## 2. DDL（MySQL）

```sql
CREATE DATABASE IF NOT EXISTS cms DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE cms;

-- ============================================================
-- 目录表
-- ============================================================
CREATE TABLE cms_folder (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    title           VARCHAR(255) NOT NULL COMMENT '标题',
    folder_code     VARCHAR(64)  NOT NULL COMMENT '目录编码（雪花算法生成）',
    parent_folder_code VARCHAR(64) NOT NULL DEFAULT '-1' COMMENT '父目录编码，-1表示根级',
    root_folder_code VARCHAR(64) DEFAULT NULL COMMENT '所属根栏目编码',
    status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1-正常 0-不可用',
    description     VARCHAR(512) DEFAULT '' COMMENT '描述',
    sort            INT          NOT NULL DEFAULT 0 COMMENT '排序字段，值越小越靠前',
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_folder_code (folder_code),
    KEY idx_parent_folder_code (parent_folder_code),
    KEY idx_root_folder_code (root_folder_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='目录表';

-- ============================================================
-- 文章表
-- ============================================================
CREATE TABLE cms_article (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    title           VARCHAR(255) NOT NULL COMMENT '标题',
    content_md      LONGTEXT     DEFAULT NULL COMMENT 'Markdown正文',
    article_code    VARCHAR(64)  NOT NULL COMMENT '文章编码（雪花算法生成）',
    folder_code     VARCHAR(64)  NOT NULL COMMENT '所属目录编码',
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT-草稿 PUBLISHED-已发布 OFFLINE-已下线',
    published_at    DATETIME     DEFAULT NULL COMMENT '发布时间',
    sort            INT          NOT NULL DEFAULT 0 COMMENT '排序字段',
    version_number  INT          NOT NULL DEFAULT 1 COMMENT '当前版本号',
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_article_code (article_code),
    KEY idx_folder_status (folder_code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';

-- ============================================================
-- 附件表
-- ============================================================
CREATE TABLE cms_attachment (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    file_name       VARCHAR(512) NOT NULL COMMENT '文件名',
    attachment_code VARCHAR(64)  NOT NULL COMMENT '附件编码（雪花算法生成）',
    file_url        VARCHAR(1024) NOT NULL COMMENT '文件访问URL',
    file_size       BIGINT       NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    storage_type    VARCHAR(20)  NOT NULL DEFAULT 'local' COMMENT '存储类型',
    storage_key     VARCHAR(1024) NOT NULL COMMENT '存储Key/路径',
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_attachment_code (attachment_code),
    KEY idx_storage_type (storage_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件表';

-- ============================================================
-- 附件关联表
-- ============================================================
CREATE TABLE cms_attachment_ref (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    ref_code        VARCHAR(64)  NOT NULL COMMENT '关联实体的编码值',
    ref_type        VARCHAR(32)  NOT NULL COMMENT '关联类型',
    attachment_code VARCHAR(64)  NOT NULL COMMENT '附件编码',
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_ref_type_code (ref_type, ref_code),
    KEY idx_attachment_code (attachment_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件关联表';

-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE cms_user (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    username        VARCHAR(64)  NOT NULL COMMENT '用户名',
    password        VARCHAR(255) NOT NULL COMMENT 'BCrypt加密密码',
    role            VARCHAR(20)  NOT NULL DEFAULT 'USER' COMMENT '角色：ADMIN-管理员 USER-普通用户',
    status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1-启用 0-禁用',
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================================
-- 栏目编辑权限表
-- ============================================================
CREATE TABLE cms_folder_permission (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    username        VARCHAR(64)  NOT NULL COMMENT '用户名',
    folder_code     VARCHAR(64)  NOT NULL COMMENT '栏目编码',
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username_folder (username, folder_code, del_flag),
    KEY idx_folder_code (folder_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='栏目编辑权限表';

-- ============================================================
-- 文章历史版本表
-- ============================================================
CREATE TABLE cms_article_version (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    article_code    VARCHAR(64)  NOT NULL COMMENT '所属文章编码',
    title           VARCHAR(255) NOT NULL COMMENT '标题快照',
    content_md      LONGTEXT     DEFAULT NULL COMMENT 'Markdown正文快照',
    status          VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED' COMMENT '归档时的状态',
    version_number  INT          NOT NULL COMMENT '版本号',
    published_at    DATETIME     DEFAULT NULL COMMENT '归档时的发布时间',
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人（归档操作人）',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（归档时间）',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_article_version (article_code, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章历史版本表';
```

## 3. H2 建表脚本（测试环境）

测试启动时自动执行，用于集成测试：

```sql
CREATE TABLE IF NOT EXISTS cms_folder (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    title                VARCHAR(255) NOT NULL,
    folder_code          VARCHAR(64)  NOT NULL,
    parent_folder_code   VARCHAR(64)  NOT NULL DEFAULT '-1',
    root_folder_code     VARCHAR(64)  DEFAULT NULL,
    status               TINYINT      NOT NULL DEFAULT 1,
    description          VARCHAR(512) DEFAULT '',
    sort                 INT          NOT NULL DEFAULT 0,
    created_by           VARCHAR(64)  DEFAULT 'system',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by           VARCHAR(64)  DEFAULT 'system',
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag             TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_folder_code UNIQUE (folder_code)
);
CREATE INDEX IF NOT EXISTS idx_parent_folder_code ON cms_folder (parent_folder_code);
CREATE INDEX IF NOT EXISTS idx_root_folder_code ON cms_folder (root_folder_code);

CREATE TABLE IF NOT EXISTS cms_article (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    title           VARCHAR(255) NOT NULL,
    content_md      CLOB         DEFAULT NULL,
    article_code    VARCHAR(64)  NOT NULL,
    folder_code     VARCHAR(64)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    published_at    TIMESTAMP    DEFAULT NULL,
    sort            INT          NOT NULL DEFAULT 0,
    version_number  INT          NOT NULL DEFAULT 1,
    created_by      VARCHAR(64)  DEFAULT 'system',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by      VARCHAR(64)  DEFAULT 'system',
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_article_code UNIQUE (article_code)
);
CREATE INDEX IF NOT EXISTS idx_folder_status ON cms_article (folder_code, status);

CREATE TABLE IF NOT EXISTS cms_attachment (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    file_name        VARCHAR(512) NOT NULL,
    attachment_code  VARCHAR(64)  NOT NULL,
    file_url         VARCHAR(1024) NOT NULL,
    file_size        BIGINT       NOT NULL DEFAULT 0,
    storage_type     VARCHAR(20)  NOT NULL DEFAULT 'local',
    storage_key      VARCHAR(1024) NOT NULL,
    created_by       VARCHAR(64)  DEFAULT 'system',
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by       VARCHAR(64)  DEFAULT 'system',
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag         TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_attachment_code UNIQUE (attachment_code)
);
CREATE INDEX IF NOT EXISTS idx_storage_type ON cms_attachment (storage_type);

CREATE TABLE IF NOT EXISTS cms_attachment_ref (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    ref_code         VARCHAR(64)  NOT NULL,
    ref_type         VARCHAR(32)  NOT NULL,
    attachment_code  VARCHAR(64)  NOT NULL,
    created_by       VARCHAR(64)  DEFAULT 'system',
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by       VARCHAR(64)  DEFAULT 'system',
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag         TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_ref_type_code ON cms_attachment_ref (ref_type, ref_code);
CREATE INDEX IF NOT EXISTS idx_attachment_code ON cms_attachment_ref (attachment_code);

CREATE TABLE IF NOT EXISTS cms_user (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    username        VARCHAR(64)  NOT NULL,
    password        VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'USER',
    status          TINYINT      NOT NULL DEFAULT 1,
    created_by      VARCHAR(64)  DEFAULT 'system',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by      VARCHAR(64)  DEFAULT 'system',
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_username UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS cms_folder_permission (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    username        VARCHAR(64)  NOT NULL,
    folder_code     VARCHAR(64)  NOT NULL,
    created_by      VARCHAR(64)  DEFAULT 'system',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by      VARCHAR(64)  DEFAULT 'system',
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_username_folder UNIQUE (username, folder_code, del_flag)
);
CREATE INDEX IF NOT EXISTS idx_fp_folder_code ON cms_folder_permission (folder_code);

CREATE TABLE IF NOT EXISTS cms_article_version (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    article_code    VARCHAR(64)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content_md      CLOB         DEFAULT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED',
    version_number  INT          NOT NULL,
    published_at    TIMESTAMP    DEFAULT NULL,
    created_by      VARCHAR(64)  DEFAULT 'system',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by      VARCHAR(64)  DEFAULT 'system',
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_av_article_version ON cms_article_version (article_code, version_number);

-- 初始化 admin 用户 (密码: Hyt7SM5@42)
INSERT INTO cms_user (username, password, role, status, created_by, updated_by)
VALUES ('admin', '$2a$10$JemZuXMrcDF.O1mZySOXh.QZdBZ5M8PAsVekVe/5MPXlCXy8Xa/fK', 'ADMIN', 1, 'system', 'system');
```

## 4. BaseEntity 公共字段规范

所有业务表继承 `BaseEntity` 基类，公共字段如下：

```java
@Data
public abstract class BaseEntity {
    @TableId(type = IdType.AUTO)  // 数据库自增主键
    private Long id;

    @TableField(fill = FieldFill.INSERT)
    private String createdBy;       // 默认值 'system'

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;  // 插入时自动填充

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String updatedBy;       // 默认值 'system'

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;  // 插入和更新时自动填充

    @TableLogic(value = "0", delval = "1")
    private Integer delFlag;        // 逻辑删除：0-未删除 1-已删除
}
```

**自动填充逻辑**（MyBatisPlusConfig 中配置）：
- INSERT 时：`strictInsertFill` 填充 createdBy=当前用户、createdAt=now()、updatedBy=当前用户、updatedAt=now()
- UPDATE 时：使用 `setFieldValByName` **强制覆盖** updatedBy=当前用户、updatedAt=now()，避免 `strictUpdateFill` 在字段已有值时跳过填充

## 5. 索引设计

### 5.1 cms_folder

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| uk_folder_code | 唯一索引 | folder_code | 业务编码唯一性保证 |
| idx_parent_folder_code | 普通索引 | parent_folder_code | 查询子目录 |
| idx_root_folder_code | 普通索引 | root_folder_code | 按根栏目查询 |

### 5.2 cms_article

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| uk_article_code | 唯一索引 | article_code | 业务编码唯一性保证 |
| idx_folder_status | 联合索引 | folder_code, status | 按目录+状态查文章 |

### 5.3 cms_attachment

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| uk_attachment_code | 唯一索引 | attachment_code | 业务编码唯一性保证 |
| idx_storage_type | 普通索引 | storage_type | 按存储类型查询 |

### 5.4 cms_attachment_ref

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| idx_ref_type_code | 联合索引 | ref_type, ref_code | 按关联实体查询附件列表 |
| idx_attachment_code | 普通索引 | attachment_code | 按附件编码查关联记录 |

### 5.5 cms_user

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| uk_username | 唯一索引 | username | 用户名唯一性保证 |

### 5.6 cms_folder_permission

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| uk_username_folder | 唯一索引 | username, folder_code, del_flag | 用户+栏目唯一性（含逻辑删除） |
| idx_folder_code | 普通索引 | folder_code | 按栏目查权限 |

### 5.7 cms_article_version

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| idx_article_version | 联合索引 | article_code, version_number | 按文章查版本 |

## 6. 关键设计决策

| 决策 | 说明 |
|------|------|
| 主键 vs 业务编码 | 主键 id 使用自增（内部关联），业务编码使用雪花算法（对外暴露，防止遍历） |
| parent_folder_code = '-1' | 表示根级目录，避免 NULL 值带来的查询复杂性 |
| root_folder_code | 子目录继承父级根栏目编码，用于权限级联和内存遍历优化 |
| content_md 使用 LONGTEXT | 文章正文可能很长，LONGTEXT 最大 4GB |
| status 设计 | 目录使用 TINYINT（0/1），文章使用 VARCHAR（DRAFT/PUBLISHED/OFFLINE） |
| ref_code 非独立编码 | 附件关联表的 ref_code 引用关联实体的编码值，非独立生成的编码 |
| 逻辑删除 | 所有表使用 del_flag 实现逻辑删除，不物理删除数据 |
| 权限表唯一索引含 del_flag | `uk_username_folder (username, folder_code, del_flag)` 允许撤销后重新授权 |
| 权限表物理删除 | 批量操作时使用 `physicalDeleteBatch` 绕过 `@TableLogic`，避免唯一索引冲突 |
| version_number | 文章表维护当前版本号，版本表存储快照，版本号自增从 1 开始 |
