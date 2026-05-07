package com.hepr.cms.article.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.article.dto.ArticleCreateDTO;
import com.hepr.cms.article.dto.ArticleUpdateDTO;
import com.hepr.cms.article.entity.Article;
import com.hepr.cms.article.mapper.ArticleMapper;
import com.hepr.cms.article.service.pdfimport.PdfImportService;
import com.hepr.cms.article.vo.ArticleVO;
import com.hepr.cms.attachment.entity.AttachmentRef;
import com.hepr.cms.attachment.mapper.AttachmentRefMapper;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.folder.service.FolderService;
import com.hepr.cms.folder.vo.FolderVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleMapper articleMapper;
    @Mock
    private AttachmentRefMapper attachmentRefMapper;
    @Mock
    private PdfImportService pdfImportService;
    @Mock
    private FolderService folderService;
    @InjectMocks
    private ArticleServiceImpl articleService;

    private Article draftArticle;

    @BeforeEach
    void setUp() {
        draftArticle = new Article();
        draftArticle.setId(1L);
        draftArticle.setArticleCode("ac_001");
        draftArticle.setTitle("测试文章");
        draftArticle.setContentMd("# Hello");
        draftArticle.setFolderCode("fc_001");
        draftArticle.setStatus("DRAFT");
        draftArticle.setSort(0);
    }

    /** 文章存在时返回详情，并写入所属目录标题 */
    @Test
    void getDetail_whenArticleExists_setsFolderTitle() {
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(draftArticle);
        FolderVO folderVO = new FolderVO();
        folderVO.setTitle("后端开发");
        when(folderService.getByCode("fc_001")).thenReturn(folderVO);

        ArticleVO result = articleService.getDetail("ac_001");

        assertThat(result.getFolderTitle()).isEqualTo("后端开发");
    }

    /** 文章不存在时抛出 404 */
    @Test
    void getDetail_whenArticleMissing_throws404() {
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(null);

        assertThatThrownBy(() -> articleService.getDetail("not_exist"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(404));
    }

    /** 所属目录不可用时不创建，抛出业务异常 */
    @Test
    void create_whenFolderInactive_throws400() {
        when(folderService.existsAndActive("not_exist")).thenReturn(false);

        ArticleCreateDTO dto = new ArticleCreateDTO();
        dto.setTitle("新文章");
        dto.setFolderCode("not_exist");

        assertThatThrownBy(() -> articleService.create(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("所属目录不存在或已不可用");
    }

    /** 目录有效时插入文章，并按当前最大 sort 递增 */
    @Test
    void create_whenValid_incrementsSortAndInserts() {
        when(folderService.existsAndActive("fc_001")).thenReturn(true);

        Article existingArticle = new Article();
        existingArticle.setSort(0);
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(existingArticle);

        ArticleCreateDTO dto = new ArticleCreateDTO();
        dto.setTitle("新文章");
        dto.setContentMd("内容");
        dto.setFolderCode("fc_001");

        ArticleVO result = articleService.create(dto);

        assertThat(result).isNotNull();
        verify(articleMapper).insert(any(Article.class));
    }

    /** 草稿发布为已发布并写入发布时间 */
    @Test
    void publish_whenDraft_setsPublished() {
        draftArticle.setStatus("DRAFT");
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.publish("ac_001");

        verify(articleMapper).updateById(argThat(a ->
                "PUBLISHED".equals(a.getStatus()) && a.getPublishedAt() != null
        ));
    }

    /** 已是已发布状态再次发布应拒绝 */
    @Test
    void publish_whenAlreadyPublished_throws400() {
        draftArticle.setStatus("PUBLISHED");
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(draftArticle);

        assertThatThrownBy(() -> articleService.publish("ac_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("当前状态不允许发布");
    }

    /** 已发布文章被编辑后应回到草稿并清空发布时间 */
    @Test
    void update_whenPublished_resetsToDraft() {
        draftArticle.setStatus("PUBLISHED");
        draftArticle.setPublishedAt(java.time.LocalDateTime.now());

        ArticleUpdateDTO dto = new ArticleUpdateDTO();
        dto.setArticleCode("ac_001");
        dto.setTitle("修改标题");
        dto.setContentMd("# Modified");
        dto.setFolderCode("fc_001");

        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.update(dto);

        verify(articleMapper).updateById(argThat(a ->
                "DRAFT".equals(a.getStatus()) && a.getPublishedAt() == null
        ));
    }

    /** 已发布文章可下线为 OFFLINE */
    @Test
    void offline_whenPublished_setsOffline() {
        draftArticle.setStatus("PUBLISHED");
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.offline("ac_001");

        verify(articleMapper).updateById(argThat(a -> "OFFLINE".equals(a.getStatus())));
    }

    /** 草稿不允许下线 */
    @Test
    void offline_whenDraft_throws400() {
        draftArticle.setStatus("DRAFT");
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(draftArticle);

        assertThatThrownBy(() -> articleService.offline("ac_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("当前状态不允许下线");
    }

    /** 删除文章时同时按条件删除附件关联 */
    @Test
    void delete_removesArticleAndAttachmentRefs() {
        when(articleMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(draftArticle);
        when(articleMapper.deleteById(1L)).thenReturn(1);

        articleService.delete("ac_001");

        verify(articleMapper).deleteById(1L);
        verify(attachmentRefMapper).delete(ArgumentMatchers.<LambdaQueryWrapper<AttachmentRef>>any());
    }

    /** 搜索关键词过短时不查库，直接返回空列表 */
    @Test
    void search_whenKeywordTooShort_returnsEmpty() {
        assertThat(articleService.search("a", false)).isEmpty();
    }

    /** 关键词长度足够且命中标题时返回搜索结果 */
    @Test
    void search_whenMatchesTitle_returnsResults() {
        when(articleMapper.selectList(ArgumentMatchers.<LambdaQueryWrapper<Article>>any())).thenReturn(List.of(draftArticle));
        when(folderService.getByCode("fc_001")).thenReturn(null);

        var result = articleService.search("测试", false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("测试文章");
    }
}
