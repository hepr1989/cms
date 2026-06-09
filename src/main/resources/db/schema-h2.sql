-- H2-compatible subset of db/schema.sql (test profile). Omits MySQL CREATE DATABASE / USE / ENGINE.

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

-- 初始化 admin 用户 (密码: Admin@123，前端 SHA-256 哈希后传输)
INSERT INTO cms_user (username, password, role, status, created_by, updated_by)
VALUES ('admin', '$2a$10$bCIHBh9NmWUFBMCFSSYJ.uFgKKpT8S5fId9ubmBjRUEtWqoCkwJDO', 'ADMIN', 1, 'system', 'system');
