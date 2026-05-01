package com.hepr.cms.search.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SearchResultVO {
    private String articleCode;
    private String title;
    private String folderCode;
    private String folderTitle;
    private String status;
    private LocalDateTime publishedAt;
    private String contentSnippet;
}
