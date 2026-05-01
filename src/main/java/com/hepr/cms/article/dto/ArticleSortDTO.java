package com.hepr.cms.article.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ArticleSortDTO {
    @NotBlank(message = "被拖拽的文章编码不能为空")
    private String movingCode;
    @NotBlank(message = "目标位置参考文章编码不能为空")
    private String targetCode;
    @NotBlank(message = "位置不能为空")
    private String position;
}
