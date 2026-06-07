package com.hepr.cms.auth.controller;

import com.hepr.cms.auth.dto.LoginDTO;
import com.hepr.cms.auth.service.UserService;
import com.hepr.cms.auth.vo.LoginVO;
import com.hepr.cms.auth.vo.UserVO;
import com.hepr.cms.common.model.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/login")
    public Result<LoginVO> login(@Validated @RequestBody LoginDTO dto) {
        return Result.ok(userService.login(dto.getUsername(), dto.getPassword()));
    }

    @GetMapping("/me")
    public Result<UserVO> me() {
        return Result.ok(userService.getCurrentUser());
    }
}
