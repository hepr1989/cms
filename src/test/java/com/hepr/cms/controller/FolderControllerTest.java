package com.hepr.cms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FolderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getRootFolders_返回200和列表() throws Exception {
        mockMvc.perform(get("/api/folders/root"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void createFolder_标题为空_返回400() throws Exception {
        String json = "{\"title\":\"\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void createFolder_标题少于3字符_返回400() throws Exception {
        String json = "{\"title\":\"ab\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void createFolder_正常创建_返回200() throws Exception {
        String json = "{\"title\":\"新目录\",\"parentFolderCode\":\"-1\"}";
        mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.folderCode").isNotEmpty())
                .andExpect(jsonPath("$.data.title").value("新目录"));
    }

    @Test
    void sortFolder_移动到目标前_返回200() throws Exception {
        // 先创建两个目录
        String json1 = "{\"title\":\"目录A\",\"parentFolderCode\":\"-1\"}";
        String resp1 = mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn().getResponse().getContentAsString();

        String json2 = "{\"title\":\"目录B\",\"parentFolderCode\":\"-1\"}";
        String resp2 = mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn().getResponse().getContentAsString();

        // 提取 folderCode
        String code1 = objectMapper.readTree(resp1).at("/data/folderCode").asText();
        String code2 = objectMapper.readTree(resp2).at("/data/folderCode").asText();

        String sortJson = String.format("{\"movingCode\":\"%s\",\"targetCode\":\"%s\",\"position\":\"BEFORE\"}", code1, code2);
        mockMvc.perform(put("/api/folders/sort")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sortJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
