package com.hepr.cms.article.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

@Data
public class ArticleCreateDTO {
    @NotBlank(message = "标题不能为空")
    @Length(min = 3, max = 255, message = "标题长度必须在3到255个字符之间")
    private String title;
    private String contentMd;
    @NotBlank(message = "所属目录不能为空")
    private String folderCode;
}
