-- H2-compatible subset of db/schema.sql (test profile). Omits MySQL CREATE DATABASE / USE / ENGINE.

CREATE TABLE IF NOT EXISTS cms_folder (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    title                VARCHAR(255) NOT NULL,
    folder_code          VARCHAR(64)  NOT NULL,
    parent_folder_code   VARCHAR(64)  NOT NULL DEFAULT '-1',
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
CREATE INDEX IF NOT EXISTS idx_status ON cms_folder (status);

CREATE TABLE IF NOT EXISTS cms_article (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    title           VARCHAR(255) NOT NULL,
    content_md      CLOB         DEFAULT NULL,
    article_code    VARCHAR(64)  NOT NULL,
    folder_code     VARCHAR(64)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    published_at    TIMESTAMP    DEFAULT NULL,
    sort            INT          NOT NULL DEFAULT 0,
    created_by      VARCHAR(64)  DEFAULT 'system',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by      VARCHAR(64)  DEFAULT 'system',
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    del_flag        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_article_code UNIQUE (article_code)
);
CREATE INDEX IF NOT EXISTS idx_folder_code ON cms_article (folder_code);
CREATE INDEX IF NOT EXISTS idx_status ON cms_article (status);
CREATE INDEX IF NOT EXISTS idx_published_at ON cms_article (published_at);

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
