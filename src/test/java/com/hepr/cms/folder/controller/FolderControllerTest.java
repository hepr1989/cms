package com.hepr.cms.folder.controller;

import com.hepr.cms.common.exception.GlobalExceptionHandler;
import com.hepr.cms.folder.dto.FolderCreateDTO;
import com.hepr.cms.folder.dto.FolderSortDTO;
import com.hepr.cms.folder.service.FolderService;
import com.hepr.cms.folder.vo.FolderVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FolderControllerTest {

    @Mock
    private FolderService folderService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        FolderController controller = new FolderController(folderService);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    /** 获取根目录列表成功，返回 Result 列表数据 */
    @Test
    void getRootFolders_whenOk_returns200AndList() throws Exception {
        FolderVO vo = new FolderVO();
        vo.setFolderCode("fc_001");
        vo.setTitle("根目录");
        when(folderService.getRootFolders(false)).thenReturn(List.of(vo));

        mockMvc.perform(get("/api/folders/root"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].folderCode").value("fc_001"))
                .andExpect(jsonPath("$.data[0].title").value("根目录"));

        verify(folderService).getRootFolders(false);
    }

    /** 目录标题为空时校验失败返回 400 */
    @Test
    void createFolder_whenTitleBlank_returns400() throws Exception {
        String json = "{\"title\":\"\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    /** 目录标题长度不足 3 时校验失败返回 400 */
    @Test
    void createFolder_whenTitleTooShort_returns400() throws Exception {
        String json = "{\"title\":\"ab\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    /** 合法创建请求应调用服务并返回新建目录信息 */
    @Test
    void createFolder_whenValid_returns200AndPayload() throws Exception {
        FolderVO created = new FolderVO();
        created.setFolderCode("fc_new");
        created.setTitle("新目录");
        when(folderService.create(any(FolderCreateDTO.class))).thenReturn(created);

        String json = "{\"title\":\"新目录\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.folderCode").value("fc_new"))
                .andExpect(jsonPath("$.data.title").value("新目录"));

        ArgumentCaptor<FolderCreateDTO> captor = ArgumentCaptor.forClass(FolderCreateDTO.class);
        verify(folderService).create(captor.capture());
        assertThat(captor.getValue().getTitle()).isEqualTo("新目录");
        assertThat(captor.getValue().getParentFolderCode()).isEqualTo("-1");
    }

    /** 排序接口将 JSON 反序列化后交给服务层处理 */
    @Test
    void sortFolder_whenValid_returns200AndDelegates() throws Exception {
        String sortJson = "{\"movingCode\":\"fc_a\",\"targetCode\":\"fc_b\",\"position\":\"BEFORE\"}";
        mockMvc.perform(put("/api/folders/sort")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sortJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        ArgumentCaptor<FolderSortDTO> captor = ArgumentCaptor.forClass(FolderSortDTO.class);
        verify(folderService).updateSort(captor.capture());
        assertThat(captor.getValue().getMovingCode()).isEqualTo("fc_a");
        assertThat(captor.getValue().getTargetCode()).isEqualTo("fc_b");
        assertThat(captor.getValue().getPosition()).isEqualTo("BEFORE");
    }

    /** portalMode=true 时应以门户模式查询根目录 */
    @Test
    void getRootFolders_whenPortalModeTrue_passesFlag() throws Exception {
        when(folderService.getRootFolders(true)).thenReturn(List.of());

        mockMvc.perform(get("/api/folders/root").param("portalMode", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray());

        verify(folderService).getRootFolders(true);
    }
}
