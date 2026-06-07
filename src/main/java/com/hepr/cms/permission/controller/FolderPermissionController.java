package com.hepr.cms.permission.controller;

import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.common.model.Result;
import com.hepr.cms.common.security.PermissionService;
import com.hepr.cms.common.security.UserContext;
import com.hepr.cms.permission.dto.BatchPermissionDTO;
import com.hepr.cms.permission.dto.PermissionDTO;
import com.hepr.cms.permission.vo.FolderPermissionVO;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folder-permissions")
@RequiredArgsConstructor
public class FolderPermissionController {

    private final PermissionService permissionService;

    @GetMapping
    public Result<List<FolderPermissionVO>> list(@RequestParam String username) {
        requireAdmin();
        return Result.ok(permissionService.getUserPermissions(username));
    }

    /** 查询当前登录用户自己的栏目权限（无需 admin） */
    @GetMapping("/mine")
    public Result<List<FolderPermissionVO>> mine() {
        String username = UserContext.getUsername();
        return Result.ok(permissionService.getUserPermissions(username));
    }

    @PostMapping("/grant")
    public Result<Void> grant(@Validated @RequestBody PermissionDTO dto) {
        requireAdmin();
        permissionService.grantPermission(dto.getUsername(), dto.getFolderCode());
        return Result.ok();
    }

    @PostMapping("/revoke")
    public Result<Void> revoke(@Validated @RequestBody PermissionDTO dto) {
        requireAdmin();
        permissionService.revokePermission(dto.getUsername(), dto.getFolderCode());
        return Result.ok();
    }

    @PostMapping("/batch")
    public Result<Void> batchUpdate(@Validated @RequestBody BatchPermissionDTO dto) {
        requireAdmin();
        permissionService.batchUpdatePermissions(
                dto.getUsername(),
                dto.getGrantCodes() != null ? dto.getGrantCodes() : List.of(),
                dto.getRevokeCodes() != null ? dto.getRevokeCodes() : List.of());
        return Result.ok();
    }

    private void requireAdmin() {
        if (!UserContext.isAdmin()) {
            throw new BusinessException(403, "无权限，仅管理员可操作");
        }
    }
}
