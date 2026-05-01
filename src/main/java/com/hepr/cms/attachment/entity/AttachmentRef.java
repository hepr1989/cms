package com.hepr.cms.attachment.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hepr.cms.common.model.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("cms_attachment_ref")
@EqualsAndHashCode(callSuper = true)
public class AttachmentRef extends BaseEntity {
    private String refCode;
    private String refType;
    private String attachmentCode;
}
