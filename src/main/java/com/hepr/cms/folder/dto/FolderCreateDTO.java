package com.hepr.cms.folder.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

@Data
public class FolderCreateDTO {
    @NotBlank(message = "标题不能为空")
    @Length(min = 3, max = 255, message = "标题长度必须在3到255个字符之间")
    private String title;
    private String parentFolderCode;
    @Length(max = 512, message = "描述长度不能超过512个字符")
    private String description;
}
