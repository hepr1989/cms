package com.hepr.cms.article.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ArticleVO {
    private String articleCode;
    private String title;
    private String contentMd;
    private String folderCode;
    private String status;
    private LocalDateTime publishedAt;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String folderTitle;
}
