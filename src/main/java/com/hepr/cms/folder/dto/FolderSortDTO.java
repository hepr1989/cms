package com.hepr.cms.folder.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FolderSortDTO {
    @NotBlank(message = "被拖拽的目录编码不能为空")
    private String movingCode;
    @NotBlank(message = "目标位置参考目录编码不能为空")
    private String targetCode;
    @NotBlank(message = "位置不能为空")
    private String position;
}
