package com.hepr.cms.folder.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hepr.cms.common.model.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("cms_folder")
@EqualsAndHashCode(callSuper = true)
public class Folder extends BaseEntity {
    private String title;
    private String folderCode;
    private String parentFolderCode;
    private Integer status;
    private String description;
    private Integer sort;
}
