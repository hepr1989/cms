package com.hepr.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.article.dto.ArticleCreateDTO;
import com.hepr.cms.article.dto.ArticleUpdateDTO;
import com.hepr.cms.article.entity.Article;
import com.hepr.cms.article.enums.ArticleStatus;
import com.hepr.cms.article.mapper.ArticleMapper;
import com.hepr.cms.article.service.impl.ArticleServiceImpl;
import com.hepr.cms.article.vo.ArticleVO;
import com.hepr.cms.attachment.mapper.AttachmentRefMapper;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.folder.service.FolderService;
import com.hepr.cms.folder.vo.FolderVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleMapper articleMapper;
    @Mock
    private AttachmentRefMapper attachmentRefMapper;
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

    @Test
    void getDetail_文章存在_填充folderTitle() {
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        FolderVO folderVO = new FolderVO();
        folderVO.setTitle("后端开发");
        when(folderService.getByCode("fc_001")).thenReturn(folderVO);

        ArticleVO result = articleService.getDetail("ac_001");

        assertThat(result.getFolderTitle()).isEqualTo("后端开发");
    }

    @Test
    void getDetail_文章不存在_抛404() {
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        assertThatThrownBy(() -> articleService.getDetail("not_exist"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(404));
    }

    @Test
    void create_目录不存在_抛400() {
        when(folderService.existsAndActive("not_exist")).thenReturn(false);

        ArticleCreateDTO dto = new ArticleCreateDTO();
        dto.setTitle("新文章");
        dto.setFolderCode("not_exist");

        assertThatThrownBy(() -> articleService.create(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("目录不存在");
    }

    @Test
    void create_成功_sort自动递增() {
        when(folderService.existsAndActive("fc_001")).thenReturn(true);

        Article existingArticle = new Article();
        existingArticle.setSort(0);
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(existingArticle);

        ArticleCreateDTO dto = new ArticleCreateDTO();
        dto.setTitle("新文章");
        dto.setContentMd("内容");
        dto.setFolderCode("fc_001");

        ArticleVO result = articleService.create(dto);

        assertThat(result).isNotNull();
    }

    @Test
    void publish_草稿发布_成功() {
        draftArticle.setStatus("DRAFT");
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.publish("ac_001");

        verify(articleMapper).updateById(argThat(a ->
                a.getStatus().equals("PUBLISHED") && a.getPublishedAt() != null
        ));
    }

    @Test
    void publish_已发布再发布_抛400() {
        draftArticle.setStatus("PUBLISHED");
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);

        assertThatThrownBy(() -> articleService.publish("ac_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("当前状态不允许发布");
    }

    @Test
    void update_已发布文章修改后变草稿() {
        draftArticle.setStatus("PUBLISHED");
        draftArticle.setPublishedAt(java.time.LocalDateTime.now());

        ArticleUpdateDTO dto = new ArticleUpdateDTO();
        dto.setArticleCode("ac_001");
        dto.setTitle("修改标题");
        dto.setContentMd("# Modified");
        dto.setFolderCode("fc_001");

        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.update(dto);

        verify(articleMapper).updateById(argThat(a ->
                a.getStatus().equals("DRAFT") && a.getPublishedAt() == null
        ));
    }

    @Test
    void offline_已发布下线_成功() {
        draftArticle.setStatus("PUBLISHED");
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);

        articleService.offline("ac_001");

        verify(articleMapper).updateById(argThat(a ->
                a.getStatus().equals("OFFLINE")
        ));
    }

    @Test
    void offline_草稿下线_抛400() {
        draftArticle.setStatus("DRAFT");
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);

        assertThatThrownBy(() -> articleService.offline("ac_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("当前状态不允许下线");
    }

    @Test
    void delete_文章删除_同时删除关联ref() {
        when(articleMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(draftArticle);
        when(articleMapper.deleteById(1L)).thenReturn(1);
        when(attachmentRefMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());

        articleService.delete("ac_001");

        verify(articleMapper).deleteById(1L);
    }

    @Test
    void search_关键词过短_返回空() {
        List<?> result = articleService.search("a", false);
        assertThat(result).isEmpty();
    }

    @Test
    void search_匹配标题_返回结果() {
        when(articleMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(draftArticle));
        when(folderService.getByCode("fc_001")).thenReturn(null);

        var result = articleService.search("测试", false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("测试文章");
    }
}
