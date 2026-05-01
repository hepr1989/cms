package com.hepr.cms.article.controller;

import com.hepr.cms.article.dto.ArticleCreateDTO;
import com.hepr.cms.article.dto.ArticleSortDTO;
import com.hepr.cms.article.dto.ArticleUpdateDTO;
import com.hepr.cms.article.service.ArticleService;
import com.hepr.cms.article.vo.ArticleVO;
import com.hepr.cms.common.model.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/articles")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping("/{articleCode}")
    public Result<ArticleVO> getDetail(@PathVariable String articleCode) {
        return Result.ok(articleService.getDetail(articleCode));
    }

    @PostMapping
    public Result<ArticleVO> create(@Validated @RequestBody ArticleCreateDTO dto) {
        return Result.ok(articleService.create(dto));
    }

    @PutMapping
    public Result<ArticleVO> update(@Validated @RequestBody ArticleUpdateDTO dto) {
        return Result.ok(articleService.update(dto));
    }

    @PutMapping("/{articleCode}/publish")
    public Result<Void> publish(@PathVariable String articleCode) {
        articleService.publish(articleCode);
        return Result.ok();
    }

    @PutMapping("/{articleCode}/offline")
    public Result<Void> offline(@PathVariable String articleCode) {
        articleService.offline(articleCode);
        return Result.ok();
    }

    @DeleteMapping("/{articleCode}")
    public Result<Void> delete(@PathVariable String articleCode) {
        articleService.delete(articleCode);
        return Result.ok();
    }

    @PutMapping("/sort")
    public Result<Void> updateSort(@Validated @RequestBody ArticleSortDTO dto) {
        articleService.updateSort(dto);
        return Result.ok();
    }
}
