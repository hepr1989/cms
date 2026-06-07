package com.hepr.cms.permission.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hepr.cms.common.model.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("cms_folder_permission")
public class FolderPermission extends BaseEntity {

    private String username;

    private String folderCode;
}
