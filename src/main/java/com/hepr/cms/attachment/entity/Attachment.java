package com.hepr.cms.attachment.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hepr.cms.common.model.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("cms_attachment")
@EqualsAndHashCode(callSuper = true)
public class Attachment extends BaseEntity {
    private String fileName;
    private String attachmentCode;
    private String fileUrl;
    private Long fileSize;
    private String storageType;
    private String storageKey;
}
