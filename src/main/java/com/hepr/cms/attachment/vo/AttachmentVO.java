package com.hepr.cms.attachment.vo;

import lombok.Data;

@Data
public class AttachmentVO {
    private String attachmentCode;
    private String fileName;
    private String fileUrl;
    private String downloadUrl;
    private Long fileSize;
    private String storageType;
}
