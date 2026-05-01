package com.hepr.cms.folder.vo;

import com.hepr.cms.article.vo.ArticleVO;
import lombok.Data;

import java.util.List;

@Data
public class FolderTreeVO {
    private List<FolderVO> folders;
    private List<ArticleVO> articles;
}
