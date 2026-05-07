package com.hepr.cms.article.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ArticleMoveDTO {
    @NotBlank(message = "文章编码不能为空")
    private String articleCode;
    @NotBlank(message = "目标目录编码不能为空")
    private String targetFolderCode;
    /** 目标位置参考文章编码（可选，为空则追加到末尾） */
    private String targetCode;
    /** 相对于 targetCode 的位置（BEFORE/AFTER，可选） */
    private String position;
}
