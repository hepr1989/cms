package com.hepr.cms.article.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hepr.cms.common.model.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@TableName("cms_article_version")
@EqualsAndHashCode(callSuper = true)
public class ArticleVersion extends BaseEntity {

    private String articleCode;

    private String title;

    private String contentMd;

    private String status;

    private Integer versionNumber;

    private LocalDateTime publishedAt;
}
