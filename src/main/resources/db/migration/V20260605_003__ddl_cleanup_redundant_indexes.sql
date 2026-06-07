-- =====================================================================
-- 增量脚本: DDL - 清理冗余索引
-- 版本: V20260605_003
-- 类型: DDL
-- 说明:
--   线上表已按 V20260605_001 创建（含冗余索引），本脚本仅做 DROP INDEX。
--   原因: 部分单列索引被复合索引左前缀覆盖，或字段基数过低无实际收益。
-- =====================================================================

-- cms_folder: status 仅 0/1，基数过低
DROP INDEX idx_status ON cms_folder;

-- cms_article: idx_folder_status(folder_code, status) 左前缀已覆盖 idx_folder_code
--              status 仅 3 枚举值，基数过低
--              published_at 单独排序场景极少
DROP INDEX idx_folder_code ON cms_article;
DROP INDEX idx_status ON cms_article;
DROP INDEX idx_published_at ON cms_article;

-- cms_user: 用户表数据量极小，查询总走 uk_username
DROP INDEX idx_role_status ON cms_user;

-- cms_folder_permission: uk_username_folder(username, folder_code, del_flag) 左前缀已覆盖
DROP INDEX idx_username ON cms_folder_permission;
DROP INDEX idx_username_del ON cms_folder_permission;

-- cms_article_version: idx_article_version(article_code, version_number) 左前缀已覆盖
DROP INDEX idx_article_code ON cms_article_version;
DROP INDEX idx_article_code_del ON cms_article_version;
