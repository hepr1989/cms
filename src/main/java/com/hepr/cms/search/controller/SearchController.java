package com.hepr.cms.search.controller;

import com.hepr.cms.article.service.ArticleService;
import com.hepr.cms.common.model.Result;
import com.hepr.cms.search.vo.SearchResultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final ArticleService articleService;

    @GetMapping
    public Result<List<SearchResultVO>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "true") boolean portalMode) {
        return Result.ok(articleService.search(keyword, portalMode));
    }
}
