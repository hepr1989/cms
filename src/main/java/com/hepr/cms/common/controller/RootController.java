package com.hepr.cms.common.controller;

import com.hepr.cms.common.model.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    @GetMapping("/")
    public Result<String> root() {
        return Result.ok("CMS 知识库系统运行中");
    }
}
