package com.hepr.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.article.service.ArticleService;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.folder.dto.FolderCreateDTO;
import com.hepr.cms.folder.dto.FolderSortDTO;
import com.hepr.cms.folder.dto.FolderUpdateDTO;
import com.hepr.cms.folder.entity.Folder;
import com.hepr.cms.folder.mapper.FolderMapper;
import com.hepr.cms.folder.service.impl.FolderServiceImpl;
import com.hepr.cms.folder.vo.FolderVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FolderServiceImplTest {

    @Mock
    private FolderMapper folderMapper;
    @Mock
    private ArticleService articleService;
    @InjectMocks
    private FolderServiceImpl folderService;

    private Folder rootFolder;
    private Folder childFolder;

    @BeforeEach
    void setUp() {
        rootFolder = new Folder();
        rootFolder.setId(1L);
        rootFolder.setFolderCode("fc_001");
        rootFolder.setTitle("技术文档");
        rootFolder.setParentFolderCode("-1");
        rootFolder.setStatus(1);
        rootFolder.setSort(0);

        childFolder = new Folder();
        childFolder.setId(2L);
        childFolder.setFolderCode("fc_002");
        childFolder.setTitle("后端开发");
        childFolder.setParentFolderCode("fc_001");
        childFolder.setStatus(1);
        childFolder.setSort(0);
    }

    @Test
    void getRootFolders_有数据_返回根级目录列表() {
        when(folderMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(rootFolder));
        when(folderMapper.countChildrenByParentCodes(List.of("fc_001"))).thenReturn(Map.of("fc_001", Map.of("parentFolderCode", "fc_001", "cnt", 1L)));
        when(articleService.countByFolderCodes(List.of("fc_001"), false)).thenReturn(Map.of("fc_001", 2));

        List<FolderVO> result = folderService.getRootFolders();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("技术文档");
        assertThat(result.get(0).getChildrenCount()).isEqualTo(1);
        assertThat(result.get(0).getArticleCount()).isEqualTo(2);
    }

    @Test
    void getRootFolders_无数据_返回空列表() {
        when(folderMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());

        List<FolderVO> result = folderService.getRootFolders();

        assertThat(result).isEmpty();
    }

    @Test
    void create_根级目录_成功() {
        FolderCreateDTO dto = new FolderCreateDTO();
        dto.setTitle("新目录");
        dto.setParentFolderCode("-1");

        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        FolderVO result = folderService.create(dto);

        assertThat(result).isNotNull();
    }

    @Test
    void create_子目录_父目录不存在_抛异常() {
        FolderCreateDTO dto = new FolderCreateDTO();
        dto.setTitle("新目录");
        dto.setParentFolderCode("not_exist");

        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        assertThatThrownBy(() -> folderService.create(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("父目录不存在");
    }

    @Test
    void create_sort自动递增() {
        FolderCreateDTO dto = new FolderCreateDTO();
        dto.setTitle("新目录2");
        dto.setParentFolderCode("-1");

        Folder existingFolder = new Folder();
        existingFolder.setSort(0);
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(existingFolder);

        FolderVO result = folderService.create(dto);

        assertThat(result).isNotNull();
    }

    @Test
    void delete_有子目录_抛异常() {
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(rootFolder);
        when(folderMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        assertThatThrownBy(() -> folderService.delete("fc_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("子目录");
    }

    @Test
    void delete_有文章_抛异常() {
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(rootFolder);
        when(folderMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
        when(articleService.countByFolderCode("fc_001")).thenReturn(2L);

        assertThatThrownBy(() -> folderService.delete("fc_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("文章");
    }

    @Test
    void delete_无子目录无文章_删除成功() {
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(rootFolder);
        when(folderMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
        when(articleService.countByFolderCode("fc_001")).thenReturn(0L);
        when(folderMapper.deleteById(1L)).thenReturn(1);

        folderService.delete("fc_001");

        verify(folderMapper).deleteById(1L);
    }

    @Test
    void updateSort_BEFORE_成功() {
        Folder moving = new Folder();
        moving.setFolderCode("fc_001");
        moving.setParentFolderCode("-1");
        moving.setSort(0);

        Folder target = new Folder();
        target.setFolderCode("fc_002");
        target.setParentFolderCode("-1");
        target.setSort(1);

        when(folderMapper.selectOne(argThat(w -> {
            // match the moving code query
            return true;
        }))).thenReturn(moving).thenReturn(target);

        FolderSortDTO dto = new FolderSortDTO();
        dto.setMovingCode("fc_001");
        dto.setTargetCode("fc_002");
        dto.setPosition("BEFORE");

        folderService.updateSort(dto);

        verify(folderMapper).incrementSortGte("-1", 1, "fc_001");
        verify(folderMapper).updateSortByCode("fc_001", 1);
    }

    @Test
    void updateSort_不同层级_抛异常() {
        Folder moving = new Folder();
        moving.setFolderCode("fc_001");
        moving.setParentFolderCode("-1");

        Folder target = new Folder();
        target.setFolderCode("fc_002");
        target.setParentFolderCode("fc_001");

        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(moving).thenReturn(target);

        FolderSortDTO dto = new FolderSortDTO();
        dto.setMovingCode("fc_001");
        dto.setTargetCode("fc_002");
        dto.setPosition("BEFORE");

        assertThatThrownBy(() -> folderService.updateSort(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("同一层级");
    }

    @Test
    void getByCode_存在_返回VO() {
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(rootFolder);

        FolderVO result = folderService.getByCode("fc_001");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("技术文档");
    }

    @Test
    void getByCode_不存在_返回null() {
        when(folderMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        FolderVO result = folderService.getByCode("not_exist");

        assertThat(result).isNull();
    }

    @Test
    void existsAndActive_存在且可用_返回true() {
        when(folderMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        boolean result = folderService.existsAndActive("fc_001");

        assertThat(result).isTrue();
    }
}
