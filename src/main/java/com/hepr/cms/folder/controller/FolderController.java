package com.hepr.cms.folder.controller;

import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.common.model.Result;
import com.hepr.cms.common.security.UserContext;
import com.hepr.cms.folder.dto.FolderCreateDTO;
import com.hepr.cms.folder.dto.FolderMoveDTO;
import com.hepr.cms.folder.dto.FolderSortDTO;
import com.hepr.cms.folder.dto.FolderUpdateDTO;
import com.hepr.cms.folder.service.FolderService;
import com.hepr.cms.folder.vo.FolderTreeVO;
import com.hepr.cms.folder.vo.FolderVO;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @GetMapping("/all")
    public Result<List<FolderVO>> getAllFoldersFlat() {
        return Result.ok(folderService.getAllFoldersFlat());
    }

    @GetMapping("/root")
    public Result<List<FolderVO>> getRootFolders(
            @RequestParam(defaultValue = "false") boolean portalMode) {
        return Result.ok(folderService.getRootFolders(portalMode));
    }

    @GetMapping("/{folderCode}")
    public Result<FolderVO> getFolder(@PathVariable String folderCode) {
        return Result.ok(folderService.getByCode(folderCode));
    }

    @GetMapping("/{folderCode}/children")
    public Result<FolderTreeVO> getChildren(
            @PathVariable String folderCode,
            @RequestParam(defaultValue = "false") boolean portalMode) {
        return Result.ok(folderService.getChildren(folderCode, portalMode));
    }

    @PostMapping
    public Result<FolderVO> create(@Validated @RequestBody FolderCreateDTO dto) {
        requireAdmin();
        return Result.ok(folderService.create(dto));
    }

    @PutMapping
    public Result<FolderVO> update(@Validated @RequestBody FolderUpdateDTO dto) {
        requireAdmin();
        return Result.ok(folderService.update(dto));
    }

    @DeleteMapping("/{folderCode}")
    public Result<Void> delete(@PathVariable String folderCode) {
        requireAdmin();
        folderService.delete(folderCode);
        return Result.ok();
    }

    @PutMapping("/sort")
    public Result<Void> updateSort(@Validated @RequestBody FolderSortDTO dto) {
        requireAdmin();
        folderService.updateSort(dto);
        return Result.ok();
    }

    @PutMapping("/move")
    public Result<Void> moveFolder(@Validated @RequestBody FolderMoveDTO dto) {
        requireAdmin();
        folderService.moveFolder(dto);
        return Result.ok();
    }

    private void requireAdmin() {
        if (!UserContext.isAdmin()) {
            throw new BusinessException(403, "无权限，仅管理员可操作");
        }
    }
}
