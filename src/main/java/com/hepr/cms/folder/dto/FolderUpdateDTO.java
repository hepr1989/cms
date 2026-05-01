package com.hepr.cms.folder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

@Data
public class FolderUpdateDTO {
    @NotBlank(message = "目录编码不能为空")
    private String folderCode;
    @NotBlank(message = "标题不能为空")
    @Length(min = 3, max = 255, message = "标题长度必须在3到255个字符之间")
    private String title;
    @Length(max = 512, message = "描述长度不能超过512个字符")
    private String description;
    @NotNull(message = "状态不能为空")
    private Integer status;
}
