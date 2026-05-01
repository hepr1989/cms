package com.hepr.cms.folder.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hepr.cms.folder.entity.Folder;
import org.apache.ibatis.annotations.MapKey;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface FolderMapper extends BaseMapper<Folder> {

    @MapKey("parentFolderCode")
    Map<String, Map<String, Object>> countChildrenByParentCodes(@Param("parentFolderCodes") List<String> parentFolderCodes);

    void incrementSortGte(@Param("parentFolderCode") String parentFolderCode,
                          @Param("thresholdSort") int thresholdSort,
                          @Param("excludeCode") String excludeCode);

    void incrementSortGt(@Param("parentFolderCode") String parentFolderCode,
                         @Param("thresholdSort") int thresholdSort,
                         @Param("excludeCode") String excludeCode);

    void updateSortByCode(@Param("folderCode") String folderCode, @Param("sort") int sort);
}
