package com.hepr.cms.article.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hepr.cms.common.model.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@TableName("cms_article")
@EqualsAndHashCode(callSuper = true)
public class Article extends BaseEntity {
    private String title;
    private String contentMd;
    private String articleCode;
    private String folderCode;
    private String status;
    private LocalDateTime publishedAt;
    private Integer sort;
}
