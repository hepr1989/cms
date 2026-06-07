package com.hepr.cms.permission.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hepr.cms.permission.entity.FolderPermission;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FolderPermissionMapper extends BaseMapper<FolderPermission> {

    /** 物理删除指定用户+栏目的权限记录（绕过 @TableLogic 软删除） */
    @Delete({
        "<script>",
        "DELETE FROM cms_folder_permission",
        "WHERE username = #{username}",
        "AND folder_code IN",
        "<foreach item='code' collection='folderCodes' open='(' separator=',' close=')'>",
        "#{code}",
        "</foreach>",
        "</script>"
    })
    int physicalDeleteBatch(@Param("username") String username, @Param("folderCodes") List<String> folderCodes);

    /** 批量插入权限记录 */
    @Insert({
        "<script>",
        "INSERT INTO cms_folder_permission (username, folder_code, created_by, created_at, updated_by, updated_at)",
        "VALUES",
        "<foreach item='perm' collection='perms' separator=','>",
        "(#{perm.username}, #{perm.folderCode}, #{perm.createdBy}, #{perm.createdAt}, #{perm.updatedBy}, #{perm.updatedAt})",
        "</foreach>",
        "</script>"
    })
    int insertBatch(@Param("perms") List<FolderPermission> perms);
}
