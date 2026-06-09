package com.hepr.cms.common.security.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.common.security.PermissionService;
import com.hepr.cms.common.security.UserContext;
import com.hepr.cms.folder.entity.Folder;
import com.hepr.cms.folder.mapper.FolderMapper;
import com.hepr.cms.permission.entity.FolderPermission;
import com.hepr.cms.permission.mapper.FolderPermissionMapper;
import com.hepr.cms.permission.vo.FolderPermissionVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final FolderPermissionMapper folderPermissionMapper;
    private final FolderMapper folderMapper;

    @Override
    public boolean canEditFolder(String username, String folderCode) {
        if (UserContext.isAdmin()) {
            return true;
        }
        Long count = folderPermissionMapper.selectCount(
                new LambdaQueryWrapper<FolderPermission>()
                        .eq(FolderPermission::getUsername, username)
                        .eq(FolderPermission::getFolderCode, folderCode));
        return count > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void grantPermission(String username, String folderCode) {
        Set<String> allCodes = collectDescendantCodesInMemory(Set.of(folderCode));

        // 物理清理可能残留的软删除记录
        folderPermissionMapper.physicalDeleteBatch(username, new ArrayList<>(allCodes));

        // 批量插入新权限
        batchInsertPermissions(username, allCodes);
        log.info("授权: username={}, folderCode={}, 级联栏目数={}", username, folderCode, allCodes.size());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void revokePermission(String username, String folderCode) {
        Set<String> allCodes = collectDescendantCodesInMemory(Set.of(folderCode));
        // 物理删除，避免软删除导致唯一索引冲突
        folderPermissionMapper.physicalDeleteBatch(username, new ArrayList<>(allCodes));
        log.info("撤销权限: username={}, folderCode={}, 级联栏目数={}", username, folderCode, allCodes.size());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchUpdatePermissions(String username, List<String> grantCodes, List<String> revokeCodes) {
        // 一次加载所有栏目，在内存中计算子栏目级联
        Map<String, List<String>> childrenMap = buildChildrenMap();

        Set<String> allGrantSet = expandDescendants(grantCodes, childrenMap);
        Set<String> allRevokeSet = expandDescendants(revokeCodes, childrenMap);

        // 移除同时存在于 grant 和 revoke 中的编码（以 grant 为准）
        allRevokeSet.removeAll(allGrantSet);

        // 物理删除要撤销的权限
        if (!allRevokeSet.isEmpty()) {
            folderPermissionMapper.physicalDeleteBatch(username, new ArrayList<>(allRevokeSet));
        }

        // 物理清理要新增的栏目可能存在的残留记录，然后批量插入
        if (!allGrantSet.isEmpty()) {
            List<String> grantList = new ArrayList<>(allGrantSet);
            folderPermissionMapper.physicalDeleteBatch(username, grantList);
            batchInsertPermissions(username, allGrantSet);
        }
        log.info("批量更新权限: username={}, 授权栏目数={}, 撤销栏目数={}", username, allGrantSet.size(), allRevokeSet.size());
    }

    @Override
    public List<FolderPermissionVO> getUserPermissions(String username) {
        List<FolderPermission> list = folderPermissionMapper.selectList(
                new LambdaQueryWrapper<FolderPermission>()
                        .eq(FolderPermission::getUsername, username));
        return list.stream()
                .map(p -> new FolderPermissionVO(p.getUsername(), p.getFolderCode()))
                .collect(Collectors.toList());
    }

    /** 一次查询所有栏目，构建 parentCode → childrenCodes 映射 */
    private Map<String, List<String>> buildChildrenMap() {
        List<Folder> allFolders = folderMapper.selectList(
                new LambdaQueryWrapper<Folder>().eq(Folder::getStatus, 1));
        Map<String, List<String>> childrenMap = new HashMap<>();
        for (Folder f : allFolders) {
            childrenMap.computeIfAbsent(f.getParentFolderCode(), k -> new ArrayList<>())
                    .add(f.getFolderCode());
        }
        return childrenMap;
    }

    /** 在内存中展开指定栏目及其所有后代栏目 */
    private Set<String> expandDescendants(List<String> codes, Map<String, List<String>> childrenMap) {
        Set<String> result = new LinkedHashSet<>();
        for (String code : codes) {
            collectDescendantsInMemory(code, childrenMap, result);
        }
        return result;
    }

    /** 内存递归收集栏目及其所有后代 */
    private void collectDescendantsInMemory(String code, Map<String, List<String>> childrenMap, Set<String> result) {
        result.add(code);
        List<String> children = childrenMap.get(code);
        if (children != null) {
            for (String child : children) {
                collectDescendantsInMemory(child, childrenMap, result);
            }
        }
    }

    /** 批量插入权限记录，自动填充审计字段 */
    private void batchInsertPermissions(String username, Set<String> codes) {
        if (codes.isEmpty()) return;
        String operator = UserContext.getUsername();
        LocalDateTime now = LocalDateTime.now();
        List<FolderPermission> perms = new ArrayList<>(codes.size());
        for (String code : codes) {
            FolderPermission perm = new FolderPermission();
            perm.setUsername(username);
            perm.setFolderCode(code);
            perm.setCreatedBy(operator);
            perm.setCreatedAt(now);
            perm.setUpdatedBy(operator);
            perm.setUpdatedAt(now);
            perm.setDelFlag(0);
            perms.add(perm);
        }
        folderPermissionMapper.insertBatch(perms);
    }

    /** 单次调用的便捷方法 */
    private Set<String> collectDescendantCodesInMemory(Set<String> codes) {
        Map<String, List<String>> childrenMap = buildChildrenMap();
        return expandDescendants(new ArrayList<>(codes), childrenMap);
    }
}
