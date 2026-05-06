package com.hepr.cms.article.service;

import com.hepr.cms.article.dto.ArticleCreateDTO;
import com.hepr.cms.article.dto.ArticleSortDTO;
import com.hepr.cms.article.dto.ArticleUpdateDTO;
import com.hepr.cms.article.vo.ArticleVO;
import com.hepr.cms.search.vo.SearchResultVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface ArticleService {
    ArticleVO getDetail(String articleCode);
    ArticleVO create(ArticleCreateDTO dto);
    ArticleVO importPdf(MultipartFile file, String folderCode);
    ArticleVO update(ArticleUpdateDTO dto);
    void publish(String articleCode);
    void offline(String articleCode);
    void delete(String articleCode);
    void updateSort(ArticleSortDTO dto);

    List<ArticleVO> listByFolderCode(String folderCode, boolean portalMode);
    long countByFolderCode(String folderCode);
    Map<String, Integer> countByFolderCodes(List<String> folderCodes, boolean publishedOnly);
    List<SearchResultVO> search(String keyword, boolean portalMode);
}
