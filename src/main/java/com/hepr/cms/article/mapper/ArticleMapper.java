package com.hepr.cms.article.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hepr.cms.article.entity.Article;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.MapKey;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface ArticleMapper extends BaseMapper<Article> {
    void incrementSortGte(@Param("folderCode") String folderCode,
                          @Param("thresholdSort") int thresholdSort,
                          @Param("excludeCode") String excludeCode);

    void incrementSortGt(@Param("folderCode") String folderCode,
                         @Param("thresholdSort") int thresholdSort,
                         @Param("excludeCode") String excludeCode);

    void updateSortByCode(@Param("articleCode") String articleCode, @Param("sort") int sort);

    Integer getMaxSort(@Param("folderCode") String folderCode);

    @MapKey("folderCode")
    Map<String, Map<String, Object>> countByFolderCodes(@Param("folderCodes") List<String> folderCodes,
                                                         @Param("publishedOnly") boolean publishedOnly);
}
