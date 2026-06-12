package com.hepr.cms.auth.controller;

import com.hepr.cms.auth.dto.UserCreateDTO;
import com.hepr.cms.auth.dto.UserPasswordDTO;
import com.hepr.cms.auth.dto.UserUpdateDTO;
import com.hepr.cms.auth.service.UserService;
import com.hepr.cms.auth.vo.UserVO;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.common.model.Result;
import com.hepr.cms.common.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public Result<List<UserVO>> list(@RequestParam(required = false) String username) {
        requireAdmin();
        return Result.ok(userService.list(username));
    }

    @PostMapping
    public Result<UserVO> create(@Validated @RequestBody UserCreateDTO dto) {
        requireAdmin();
        return Result.ok(userService.create(dto));
    }

    @PutMapping
    public Result<UserVO> update(@Validated @RequestBody UserUpdateDTO dto) {
        requireAdmin();
        return Result.ok(userService.update(dto));
    }

    @DeleteMapping("/{username}")
    public Result<Void> delete(@PathVariable String username) {
        requireAdmin();
        userService.delete(username);
        return Result.ok();
    }

    @PutMapping("/{username}/password")
    public Result<Void> resetPassword(@PathVariable String username,
                                      @Validated @RequestBody UserPasswordDTO dto) {
        requireAdmin();
        userService.resetPassword(username, dto);
        return Result.ok();
    }

    private void requireAdmin() {
        if (!UserContext.isAdmin()) {
            throw new BusinessException(403, "无权限，仅管理员可操作");
        }
    }
}
