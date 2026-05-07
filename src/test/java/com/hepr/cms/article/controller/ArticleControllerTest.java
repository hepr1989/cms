package com.hepr.cms.article.controller;

import com.hepr.cms.article.dto.ArticleCreateDTO;
import com.hepr.cms.article.service.ArticleService;
import com.hepr.cms.article.vo.ArticleVO;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MockMvc standalone：不启动 Spring 容器，仅验证 Web 层与全局异常映射。
 */
@ExtendWith(MockitoExtension.class)
class ArticleControllerTest {

    @Mock
    private ArticleService articleService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        ArticleController controller = new ArticleController(articleService);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    /** 创建文章请求体未通过 Bean 校验时返回 400 */
    @Test
    void create_whenValidationFails_returns400() throws Exception {
        String json = "{\"title\":\"ab\",\"folderCode\":\"fc_001\"}";
        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    /** 服务层判定目录不可用时，经全局异常处理返回业务码 400 */
    @Test
    void create_whenFolderUnavailable_returns400() throws Exception {
        when(articleService.create(any(ArticleCreateDTO.class)))
                .thenThrow(new BusinessException(400, "所属目录不存在或已不可用"));

        String json = "{\"title\":\"测试文章\",\"contentMd\":\"\",\"folderCode\":\"not_exist\"}";
        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("所属目录不存在或已不可用"));

        verify(articleService).create(any(ArticleCreateDTO.class));
    }

    /** 发布不存在的文章时返回 404 业务码 */
    @Test
    void publish_whenArticleMissing_returns404() throws Exception {
        doThrow(new BusinessException(404, "文章不存在")).when(articleService).publish(eq("not_exist"));

        mockMvc.perform(put("/api/articles/not_exist/publish"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));

        verify(articleService).publish("not_exist");
    }

    /** 查询详情成功时返回统一 Result 包装与文章数据 */
    @Test
    void getDetail_whenOk_returns200AndBody() throws Exception {
        ArticleVO vo = new ArticleVO();
        vo.setArticleCode("ac_001");
        vo.setTitle("标题");
        when(articleService.getDetail("ac_001")).thenReturn(vo);

        mockMvc.perform(get("/api/articles/ac_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.articleCode").value("ac_001"))
                .andExpect(jsonPath("$.data.title").value("标题"));
    }
}
