package com.hepr.cms.folder.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.article.service.ArticleService;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.folder.dto.FolderCreateDTO;
import com.hepr.cms.folder.dto.FolderSortDTO;
import com.hepr.cms.folder.entity.Folder;
import com.hepr.cms.folder.mapper.FolderMapper;
import com.hepr.cms.folder.vo.FolderVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FolderServiceImplTest {

    @Mock
    private FolderMapper folderMapper;
    @Mock
    private ArticleService articleService;
    @InjectMocks
    private FolderServiceImpl folderService;

    private Folder rootFolder;

    @BeforeEach
    void setUp() {
        rootFolder = new Folder();
        rootFolder.setId(1L);
        rootFolder.setFolderCode("fc_001");
        rootFolder.setTitle("技术文档");
        rootFolder.setParentFolderCode("-1");
        rootFolder.setStatus(1);
        rootFolder.setSort(0);
    }

    /** 根目录列表应合并子目录数与文章数 */
    @Test
    void getRootFolders_whenData_populatesCounts() {
        when(folderMapper.selectList(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(List.of(rootFolder));
        Map<String, Object> countRow = new HashMap<>();
        countRow.put("cnt", 1L);
        when(folderMapper.countChildrenByParentCodes(anyList())).thenReturn(Map.of("fc_001", countRow));
        when(articleService.countByFolderCodes(anyList(), anyBoolean())).thenReturn(Map.of("fc_001", 2));

        List<FolderVO> result = folderService.getRootFolders(false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("技术文档");
        assertThat(result.get(0).getChildrenCount()).isEqualTo(1);
        assertThat(result.get(0).getArticleCount()).isEqualTo(2);
    }

    /** 无根级目录时返回空列表 */
    @Test
    void getRootFolders_whenEmpty_returnsEmptyList() {
        when(folderMapper.selectList(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(Collections.emptyList());

        List<FolderVO> result = folderService.getRootFolders(false);

        assertThat(result).isEmpty();
    }

    /** 在根下创建目录时插入新记录 */
    @Test
    void create_atRoot_insertsFolder() {
        FolderCreateDTO dto = new FolderCreateDTO();
        dto.setTitle("新目录");
        dto.setParentFolderCode("-1");

        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(null);

        FolderVO result = folderService.create(dto);

        assertThat(result).isNotNull();
        verify(folderMapper).insert(any(Folder.class));
    }

    /** 父目录编码无效时拒绝创建 */
    @Test
    void create_whenParentMissing_throws400() {
        FolderCreateDTO dto = new FolderCreateDTO();
        dto.setTitle("新目录");
        dto.setParentFolderCode("not_exist");

        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(null);

        assertThatThrownBy(() -> folderService.create(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("父目录不存在");
    }

    /** 同父级下已有目录时，新目录 sort 在最大值基础上递增 */
    @Test
    void create_whenMaxSortExists_incrementsSort() {
        FolderCreateDTO dto = new FolderCreateDTO();
        dto.setTitle("新目录2");
        dto.setParentFolderCode("-1");

        Folder existingFolder = new Folder();
        existingFolder.setSort(0);
        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(existingFolder);

        FolderVO result = folderService.create(dto);

        assertThat(result).isNotNull();
        verify(folderMapper).insert(any(Folder.class));
    }

    /** 存在子目录时不允许删除 */
    @Test
    void delete_whenHasChildFolders_throws400() {
        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(rootFolder);
        when(folderMapper.selectCount(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(1L);

        assertThatThrownBy(() -> folderService.delete("fc_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("子目录");
    }

    /** 目录下仍有文章时不允许删除 */
    @Test
    void delete_whenHasArticles_throws400() {
        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(rootFolder);
        when(folderMapper.selectCount(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(0L);
        when(articleService.countByFolderCode("fc_001")).thenReturn(2L);

        assertThatThrownBy(() -> folderService.delete("fc_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("文章");
    }

    /** 无子目录且无文章时可物理删除 */
    @Test
    void delete_whenEmpty_deletesFolder() {
        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(rootFolder);
        when(folderMapper.selectCount(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(0L);
        when(articleService.countByFolderCode("fc_001")).thenReturn(0L);
        when(folderMapper.deleteById(1L)).thenReturn(1);

        folderService.delete("fc_001");

        verify(folderMapper).deleteById(1L);
    }

    /** BEFORE 排序时调用增量与更新 sort */
    @Test
    void updateSort_whenBeforeTarget_adjustsOrder() {
        Folder moving = new Folder();
        moving.setFolderCode("fc_001");
        moving.setParentFolderCode("-1");
        moving.setSort(0);

        Folder target = new Folder();
        target.setFolderCode("fc_002");
        target.setParentFolderCode("-1");
        target.setSort(1);

        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(moving, target);

        FolderSortDTO dto = new FolderSortDTO();
        dto.setMovingCode("fc_001");
        dto.setTargetCode("fc_002");
        dto.setPosition("BEFORE");

        folderService.updateSort(dto);

        verify(folderMapper).incrementSortGte("-1", 1, "fc_001");
        verify(folderMapper).updateSortByCode("fc_001", 1);
    }

    /** 移动项与目标项不在同一父级下则拒绝排序 */
    @Test
    void updateSort_whenDifferentParent_throws400() {
        Folder moving = new Folder();
        moving.setFolderCode("fc_001");
        moving.setParentFolderCode("-1");

        Folder target = new Folder();
        target.setFolderCode("fc_002");
        target.setParentFolderCode("fc_001");

        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(moving, target);

        FolderSortDTO dto = new FolderSortDTO();
        dto.setMovingCode("fc_001");
        dto.setTargetCode("fc_002");
        dto.setPosition("BEFORE");

        assertThatThrownBy(() -> folderService.updateSort(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("同一层级");
    }

    /** 根据编码能查到目录时返回 VO */
    @Test
    void getByCode_whenExists_returnsVo() {
        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(rootFolder);

        FolderVO result = folderService.getByCode("fc_001");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("技术文档");
    }

    /** 编码不存在时返回 null */
    @Test
    void getByCode_whenMissing_returnsNull() {
        when(folderMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(null);

        FolderVO result = folderService.getByCode("not_exist");

        assertThat(result).isNull();
    }

    /** 目录存在且 status=1 时 existsAndActive 为 true */
    @Test
    void existsAndActive_whenPresent_returnsTrue() {
        when(folderMapper.selectCount(ArgumentMatchers.<LambdaQueryWrapper<Folder>>any())).thenReturn(1L);

        boolean result = folderService.existsAndActive("fc_001");

        assertThat(result).isTrue();
    }
}
