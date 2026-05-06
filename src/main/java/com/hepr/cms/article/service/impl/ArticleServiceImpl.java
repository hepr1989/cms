package com.hepr.cms.article.service.impl;

import com.hepr.cms.common.util.BeanCopyUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.hepr.cms.article.dto.ArticleCreateDTO;
import com.hepr.cms.article.dto.ArticleSortDTO;
import com.hepr.cms.article.dto.ArticleUpdateDTO;
import com.hepr.cms.article.entity.Article;
import com.hepr.cms.article.enums.ArticleStatus;
import com.hepr.cms.article.mapper.ArticleMapper;
import com.hepr.cms.article.service.ArticleService;
import com.hepr.cms.article.service.pdfimport.PdfImportResult;
import com.hepr.cms.article.service.pdfimport.PdfImportService;
import com.hepr.cms.article.vo.ArticleVO;
import com.hepr.cms.attachment.entity.AttachmentRef;
import com.hepr.cms.attachment.mapper.AttachmentRefMapper;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.folder.service.FolderService;
import com.hepr.cms.folder.vo.FolderVO;
import com.hepr.cms.search.vo.SearchResultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArticleServiceImpl implements ArticleService {

    private final ArticleMapper articleMapper;
    private final AttachmentRefMapper attachmentRefMapper;
    private final PdfImportService pdfImportService;
    @Lazy
    private final FolderService folderService;

    @Override
    public ArticleVO getDetail(String articleCode) {
        Article article = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>().eq(Article::getArticleCode, articleCode));
        if (article == null) throw new BusinessException(404, "文章不存在");

        ArticleVO vo = BeanCopyUtil.copyProperties(article, ArticleVO.class);
        FolderVO folderVO = folderService.getByCode(article.getFolderCode());
        if (folderVO != null) vo.setFolderTitle(folderVO.getTitle());
        return vo;
    }

    @Override
    @Transactional
    public ArticleVO create(ArticleCreateDTO dto) {
        if (!folderService.existsAndActive(dto.getFolderCode())) {
            throw new BusinessException(400, "所属目录不存在或已不可用");
        }

        Article article = new Article();
        article.setArticleCode(IdWorker.getIdStr());
        article.setTitle(dto.getTitle());
        article.setContentMd(dto.getContentMd());
        article.setFolderCode(dto.getFolderCode());

        Article maxSortArticle = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>()
                        .eq(Article::getFolderCode, dto.getFolderCode())
                        .orderByDesc(Article::getSort)
                        .last("LIMIT 1"));
        article.setSort(maxSortArticle != null ? maxSortArticle.getSort() + 1 : 0);
        article.setStatus(ArticleStatus.DRAFT.name());
        article.setPublishedAt(null);

        articleMapper.insert(article);
        return BeanCopyUtil.copyProperties(article, ArticleVO.class);
    }

    @Override
    @Transactional
    public ArticleVO importPdf(MultipartFile file, String folderCode) {
        if (!folderService.existsAndActive(folderCode)) {
            throw new BusinessException(400, "所属目录不存在或已不可用");
        }

        // 校验文件为 PDF
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        if ((contentType == null || !contentType.contains("pdf"))
                && (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf"))) {
            throw new BusinessException(400, "仅支持导入 PDF 文件");
        }

        // 先创建空文章以获得 articleCode
        Article article = new Article();
        article.setArticleCode(IdWorker.getIdStr());
        article.setTitle("导入中...");
        article.setContentMd("");
        article.setFolderCode(folderCode);

        Article maxSortArticle = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>()
                        .eq(Article::getFolderCode, folderCode)
                        .orderByDesc(Article::getSort)
                        .last("LIMIT 1"));
        article.setSort(maxSortArticle != null ? maxSortArticle.getSort() + 1 : 0);
        article.setStatus(ArticleStatus.DRAFT.name());
        article.setPublishedAt(null);

        articleMapper.insert(article);

        // 解析 PDF 转换为 Markdown
        PdfImportResult importResult = pdfImportService.convertToMarkdown(file, article.getArticleCode());

        // 更新文章内容
        article.setTitle(importResult.getTitle());
        article.setContentMd(importResult.getMarkdown());
        articleMapper.updateById(article);

        return BeanCopyUtil.copyProperties(article, ArticleVO.class);
    }

    @Override
    @Transactional
    public ArticleVO update(ArticleUpdateDTO dto) {
        Article article = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>().eq(Article::getArticleCode, dto.getArticleCode()));
        if (article == null) throw new BusinessException(404, "文章不存在");

        if (!article.getFolderCode().equals(dto.getFolderCode())) {
            if (!folderService.existsAndActive(dto.getFolderCode())) {
                throw new BusinessException(400, "所属目录不存在或已不可用");
            }
        }

        if (ArticleStatus.PUBLISHED.name().equals(article.getStatus())) {
            article.setStatus(ArticleStatus.DRAFT.name());
            article.setPublishedAt(null);
        }

        article.setTitle(dto.getTitle());
        article.setContentMd(dto.getContentMd());
        article.setFolderCode(dto.getFolderCode());
        articleMapper.updateById(article);
        return BeanCopyUtil.copyProperties(article, ArticleVO.class);
    }

    @Override
    @Transactional
    public void publish(String articleCode) {
        Article article = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>().eq(Article::getArticleCode, articleCode));
        if (article == null) throw new BusinessException(404, "文章不存在");

        ArticleStatus current = ArticleStatus.valueOf(article.getStatus());
        if (!current.canTransitionTo(ArticleStatus.PUBLISHED)) {
            throw new BusinessException(400, "当前状态不允许发布，状态：" + current);
        }
        article.setStatus(ArticleStatus.PUBLISHED.name());
        article.setPublishedAt(LocalDateTime.now());
        articleMapper.updateById(article);
    }

    @Override
    @Transactional
    public void offline(String articleCode) {
        Article article = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>().eq(Article::getArticleCode, articleCode));
        if (article == null) throw new BusinessException(404, "文章不存在");

        ArticleStatus current = ArticleStatus.valueOf(article.getStatus());
        if (!current.canTransitionTo(ArticleStatus.OFFLINE)) {
            throw new BusinessException(400, "当前状态不允许下线，状态：" + current);
        }
        article.setStatus(ArticleStatus.OFFLINE.name());
        articleMapper.updateById(article);
    }

    @Override
    @Transactional
    public void delete(String articleCode) {
        Article article = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>().eq(Article::getArticleCode, articleCode));
        if (article == null) throw new BusinessException(404, "文章不存在");

        articleMapper.deleteById(article.getId());

        attachmentRefMapper.delete(
                new LambdaQueryWrapper<AttachmentRef>()
                        .eq(AttachmentRef::getRefCode, articleCode)
                        .eq(AttachmentRef::getRefType, "article"));
    }

    @Override
    @Transactional
    public void updateSort(ArticleSortDTO dto) {
        Article moving = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>().eq(Article::getArticleCode, dto.getMovingCode()));
        Article target = articleMapper.selectOne(
                new LambdaQueryWrapper<Article>().eq(Article::getArticleCode, dto.getTargetCode()));
        if (moving == null || target == null) throw new BusinessException(404, "文章不存在");
        if (!moving.getFolderCode().equals(target.getFolderCode())) {
            throw new BusinessException(400, "只能在同一目录内排序");
        }

        String folderCode = moving.getFolderCode();
        if ("BEFORE".equals(dto.getPosition())) {
            articleMapper.incrementSortGte(folderCode, target.getSort(), dto.getMovingCode());
            articleMapper.updateSortByCode(dto.getMovingCode(), target.getSort());
        } else {
            articleMapper.incrementSortGt(folderCode, target.getSort(), dto.getMovingCode());
            articleMapper.updateSortByCode(dto.getMovingCode(), target.getSort() + 1);
        }
    }

    @Override
    public List<ArticleVO> listByFolderCode(String folderCode, boolean portalMode) {
        LambdaQueryWrapper<Article> qw = new LambdaQueryWrapper<Article>()
                .eq(Article::getFolderCode, folderCode);
        if (portalMode) {
            qw.eq(Article::getStatus, ArticleStatus.PUBLISHED.name());
        }
        qw.orderByAsc(Article::getSort);
        return articleMapper.selectList(qw).stream()
                .map(a -> BeanCopyUtil.copyProperties(a, ArticleVO.class))
                .collect(Collectors.toList());
    }

    @Override
    public long countByFolderCode(String folderCode) {
        return articleMapper.selectCount(
                new LambdaQueryWrapper<Article>().eq(Article::getFolderCode, folderCode));
    }

    @Override
    public Map<String, Integer> countByFolderCodes(List<String> folderCodes, boolean publishedOnly) {
        if (folderCodes == null || folderCodes.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Map<String, Object>> rawMap = articleMapper.countByFolderCodes(folderCodes, publishedOnly);
        if (rawMap == null) return Collections.emptyMap();
        Map<String, Integer> result = new HashMap<>();
        for (Map.Entry<String, Map<String, Object>> entry : rawMap.entrySet()) {
            Object cnt = entry.getValue().get("cnt");
            result.put(entry.getKey(), cnt != null ? ((Number) cnt).intValue() : 0);
        }
        return result;
    }

    @Override
    public List<SearchResultVO> search(String keyword, boolean portalMode) {
        if (!StringUtils.hasText(keyword) || keyword.trim().length() < 2) {
            return Collections.emptyList();
        }
        String kw = keyword.trim();
        LambdaQueryWrapper<Article> qw = new LambdaQueryWrapper<>();
        qw.and(w -> w.like(Article::getTitle, kw).or().like(Article::getContentMd, kw));
        if (portalMode) {
            qw.eq(Article::getStatus, "PUBLISHED");
        }
        qw.last("LIMIT 50");
        List<Article> articles = articleMapper.selectList(qw);

        Map<String, String> folderTitleMap = new HashMap<>();
        if (!articles.isEmpty()) {
            List<String> folderCodes = articles.stream()
                    .map(Article::getFolderCode)
                    .distinct()
                    .collect(Collectors.toList());
            for (String code : folderCodes) {
                FolderVO folderVO = folderService.getByCode(code);
                if (folderVO != null) {
                    folderTitleMap.put(code, folderVO.getTitle());
                }
            }
        }

        return articles.stream().map(a -> {
            SearchResultVO vo = new SearchResultVO();
            vo.setArticleCode(a.getArticleCode());
            vo.setTitle(a.getTitle());
            vo.setFolderCode(a.getFolderCode());
            vo.setStatus(a.getStatus());
            vo.setPublishedAt(a.getPublishedAt());
            if (a.getContentMd() != null) {
                int idx = a.getContentMd().indexOf(kw);
                if (idx >= 0) {
                    int start = Math.max(0, idx - 50);
                    int end = Math.min(a.getContentMd().length(), idx + kw.length() + 50);
                    vo.setContentSnippet(
                            (start > 0 ? "..." : "") +
                            a.getContentMd().substring(start, end) +
                            (end < a.getContentMd().length() ? "..." : ""));
                }
            }
            vo.setFolderTitle(folderTitleMap.get(a.getFolderCode()));
            return vo;
        }).collect(Collectors.toList());
    }
}
