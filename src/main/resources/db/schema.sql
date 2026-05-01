CREATE DATABASE IF NOT EXISTS cms DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE cms;

CREATE TABLE cms_folder (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键（自增）',
    title           VARCHAR(255) NOT NULL COMMENT '标题',
    folder_code     VARCHAR(64)  NOT NULL COMMENT '目录编码（雪花算法生成）',
    parent_folder_code VARCHAR(64) NOT NULL DEFAULT '-1' COMMENT '父目录编码，-1表示根级',
    status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1-正常 0-不可用',
    description     VARCHAR(512) DEFAULT '' COMMENT '描述',
    sort            INT          NOT NULL DEFAULT 0 COMMENT '排序字段',
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
