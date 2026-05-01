package com.hepr.cms.folder.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FolderVO {
    private String folderCode;
    private String title;
    private String parentFolderCode;
    private Integer status;
    private String description;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer childrenCount;
    private Integer articleCount;
}
