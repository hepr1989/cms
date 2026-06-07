-- =====================================================================
-- 增量脚本: DDL - 用户认证与栏目权限与版本管理
-- 版本: V20260605_001
-- 类型: DDL
-- 说明:
--   1. 新增 cms_user（用户表）
--   2. 新增 cms_folder_permission（栏目编辑权限表）
--   3. 新增 cms_article_version（文章历史版本表）
--   4. cms_folder 新增 root_folder_code 字段（优化栏目树查询）
--   5. cms_article 新增 version_number 字段（版本管理）
-- 注意: 本脚本包含冗余索引，由 V20260605_003 统一清理
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 创建 cms_user（用户表）
-- ---------------------------------------------------------------------
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
    UNIQUE KEY uk_username (username),
    KEY idx_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ---------------------------------------------------------------------
-- 2. 创建 cms_folder_permission（栏目编辑权限表）
-- ---------------------------------------------------------------------
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
    KEY idx_username (username),
    KEY idx_username_del (username, del_flag),
    KEY idx_folder_code (folder_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='栏目编辑权限表';

-- ---------------------------------------------------------------------
-- 3. 创建 cms_article_version（文章历史版本表）
-- ---------------------------------------------------------------------
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
    KEY idx_article_code (article_code),
    KEY idx_article_code_del (article_code, del_flag),
    KEY idx_article_version (article_code, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章历史版本表';

-- ---------------------------------------------------------------------
-- 4. cms_folder 新增 root_folder_code 字段
-- ---------------------------------------------------------------------
ALTER TABLE cms_folder ADD COLUMN root_folder_code VARCHAR(64) DEFAULT NULL COMMENT '所属根栏目编码' AFTER parent_folder_code;
CREATE INDEX idx_root_folder_code ON cms_folder (root_folder_code);

-- ---------------------------------------------------------------------
-- 5. cms_article 新增 version_number 字段 + 补充复合索引
-- ---------------------------------------------------------------------
ALTER TABLE cms_article ADD COLUMN version_number INT NOT NULL DEFAULT 1 COMMENT '当前版本号';
CREATE INDEX idx_folder_status ON cms_article (folder_code, status);
