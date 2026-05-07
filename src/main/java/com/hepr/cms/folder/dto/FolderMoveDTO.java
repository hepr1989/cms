package com.hepr.cms.folder.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FolderMoveDTO {
    @NotBlank(message = "目录编码不能为空")
    private String folderCode;
    @NotBlank(message = "目标父目录编码不能为空")
    private String targetParentFolderCode;
    /** 目标位置参考目录编码（可选，为空则追加到末尾） */
    private String targetCode;
    /** 相对于 targetCode 的位置（BEFORE/AFTER，可选） */
    private String position;
}
