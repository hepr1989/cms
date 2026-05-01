# CMS 内容管理系统 — 数据库设计文档

## 1. 概述

CMS 系统共包含 4 张数据表：

| 表名 | 说明 | 主键策略 | 业务编码字段 |
|------|------|---------|------------|
| cms_folder | 目录表 | AUTO_INCREMENT | folder_code（雪花算法） |
| cms_article | 文章表 | AUTO_INCREMENT | article_code（雪花算法） |
| cms_attachment | 附件表 | AUTO_INCREMENT | attachment_code（雪花算法） |
| cms_attachment_ref | 附件关联表 | AUTO_INCREMENT | ref_code 引用关联实体编码 |

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
    KEY idx_status (status)
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
    created_by      VARCHAR(64)  DEFAULT 'system' COMMENT '创建人',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)  DEFAULT 'system' COMMENT '更新人',
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_article_code (article_code),
    KEY idx_folder_code (folder_code),
    KEY idx_status (status),
    KEY idx_published_at (published_at)
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
    storage_type    VARCHAR(20)  NOT NULL DEFAULT 'local' COMMENT '存储类型：local-本地',
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
    ref_code        VARCHAR(64)  NOT NULL COMMENT '关联实体的编码值（如某篇文章的article_code）',
    ref_type        VARCHAR(32)  NOT NULL COMMENT '关联类型（如article）',
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
```

## 3. H2 建表脚本（测试环境）

测试启动时自动执行，用于集成测试：

```sql
CREATE TABLE IF NOT EXISTS cms_folder (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    folder_code VARCHAR(64) NOT NULL UNIQUE,
    parent_folder_code VARCHAR(64) NOT NULL DEFAULT '-1',
    status INT NOT NULL DEFAULT 1,
    description VARCHAR(512),
    sort INT NOT NULL DEFAULT 0,
    created_by VARCHAR(64) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    del_flag INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cms_article (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_md LONGTEXT,
    article_code VARCHAR(64) NOT NULL UNIQUE,
    folder_code VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP,
    sort INT NOT NULL DEFAULT 0,
    created_by VARCHAR(64) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    del_flag INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cms_attachment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    attachment_code VARCHAR(64) NOT NULL UNIQUE,
    file_url VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    storage_type VARCHAR(20) NOT NULL DEFAULT 'local',
    storage_key VARCHAR(512),
    created_by VARCHAR(64) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    del_flag INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cms_attachment_ref (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ref_code VARCHAR(64) NOT NULL,
    ref_type VARCHAR(32) NOT NULL,
    attachment_code VARCHAR(64) NOT NULL,
    created_by VARCHAR(64) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    del_flag INT NOT NULL DEFAULT 0
);
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
- INSERT 时：createdBy='system'、createdAt=now()、updatedBy='system'、updatedAt=now()
- UPDATE 时：updatedBy='system'、updatedAt=now()

## 5. 索引设计

### 5.1 cms_folder

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| uk_folder_code | 唯一索引 | folder_code | 业务编码唯一性保证 |
| idx_parent_folder_code | 普通索引 | parent_folder_code | 查询子目录 |
| idx_status | 普通索引 | status | 状态过滤 |

### 5.2 cms_article

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| PRIMARY | 主键 | id | 主键查询 |
| uk_article_code | 唯一索引 | article_code | 业务编码唯一性保证 |
| idx_folder_code | 普通索引 | folder_code | 按目录查文章 |
| idx_status | 普通索引 | status | 状态过滤 |
| idx_published_at | 普通索引 | published_at | 按发布时间排序 |

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

## 6. 关键设计决策

| 决策 | 说明 |
|------|------|
| 主键 vs 业务编码 | 主键 id 使用自增（内部关联），业务编码使用雪花算法（对外暴露，防止遍历） |
| parent_folder_code = '-1' | 表示根级目录，避免 NULL 值带来的查询复杂性 |
| content_md 使用 LONGTEXT | 文章正文可能很长，LONGTEXT 最大 4GB |
| status 设计 | 目录使用 TINYINT（0/1），文章使用 VARCHAR（DRAFT/PUBLISHED/OFFLINE） |
| ref_code 非独立编码 | 附件关联表的 ref_code 引用关联实体的编码值，非独立生成的编码 |
| 逻辑删除 | 所有表使用 del_flag 实现逻辑删除，不物理删除数据 |
