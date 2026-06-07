package com.hepr.cms.article.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ArticleVersionVO {

    private Integer versionNumber;
    private String status;
    private String contentMd;
    private String title;
    private String createdBy;
    private LocalDateTime createdAt;
}
