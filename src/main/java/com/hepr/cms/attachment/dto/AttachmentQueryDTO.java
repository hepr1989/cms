package com.hepr.cms.attachment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AttachmentQueryDTO {
    @NotBlank(message = "关联类型不能为空")
    private String refType;
    @NotBlank(message = "关联编码不能为空")
    private String refCode;
}
