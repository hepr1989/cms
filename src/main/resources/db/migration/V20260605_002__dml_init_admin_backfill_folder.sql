-- =====================================================================
-- 增量脚本: DML - 数据初始化与回填
-- 版本: V20260605_002
-- 类型: DML
-- 说明:
--   1. 初始化 admin 用户（密码: Hyt7SM5@42，BCrypt加密）
--   2. 回填 cms_folder.root_folder_code（顶级栏目设自身，子栏目继承父级）
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 初始化 admin 用户
-- 密码明文: Hyt7SM5@42
-- BCrypt 哈希: 由 BCryptPasswordEncoder 生成（strength=10）
-- 注意: 此哈希值固定，生产环境如需修改密码请通过管理界面重置
-- ---------------------------------------------------------------------
INSERT INTO cms_user (username, password, role, status, created_by, updated_by)
VALUES ('admin', '$2a$10$JemZuXMrcDF.O1mZySOXh.QZdBZ5M8PAsVekVe/5MPXlCXy8Xa/fK', 'ADMIN', 1, 'system', 'system');

-- ---------------------------------------------------------------------
-- 2. 回填 cms_folder.root_folder_code
-- ---------------------------------------------------------------------
-- 2.1 顶级栏目（parent_folder_code='-1' 或 NULL）设为自身 folder_code
UPDATE cms_folder
SET root_folder_code = folder_code
WHERE (parent_folder_code = '-1' OR parent_folder_code IS NULL)
  AND del_flag = 0;

-- 2.2 逐级更新子栏目（按层级深度循环执行，直到无更新）
-- 第一级子栏目
UPDATE cms_folder f
INNER JOIN cms_folder p ON f.parent_folder_code = p.folder_code
SET f.root_folder_code = p.root_folder_code
WHERE f.root_folder_code IS NULL
  AND p.root_folder_code IS NOT NULL
  AND f.del_flag = 0
  AND p.del_flag = 0;

-- 第二级子栏目（如有更深层级，重复执行此语句直到无更新）
UPDATE cms_folder f
INNER JOIN cms_folder p ON f.parent_folder_code = p.folder_code
SET f.root_folder_code = p.root_folder_code
WHERE f.root_folder_code IS NULL
  AND p.root_folder_code IS NOT NULL
  AND f.del_flag = 0
  AND p.del_flag = 0;

-- 第三级子栏目（如有更深层级，重复执行此语句直到无更新）
UPDATE cms_folder f
INNER JOIN cms_folder p ON f.parent_folder_code = p.folder_code
SET f.root_folder_code = p.root_folder_code
WHERE f.root_folder_code IS NULL
  AND p.root_folder_code IS NOT NULL
  AND f.del_flag = 0
  AND p.del_flag = 0;
