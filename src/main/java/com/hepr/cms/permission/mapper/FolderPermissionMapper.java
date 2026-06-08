package com.hepr.cms.permission.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hepr.cms.permission.entity.FolderPermission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FolderPermissionMapper extends BaseMapper<FolderPermission> {

    /** 物理删除指定用户+栏目的权限记录（绕过 @TableLogic 软删除） */
    int physicalDeleteBatch(@Param("username") String username, @Param("folderCodes") List<String> folderCodes);

    /** 批量插入权限记录 */
    int insertBatch(@Param("perms") List<FolderPermission> perms);
}
