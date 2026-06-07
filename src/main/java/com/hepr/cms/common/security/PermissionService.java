package com.hepr.cms.common.security;

import com.hepr.cms.permission.vo.FolderPermissionVO;

import java.util.List;

public interface PermissionService {

    boolean canEditFolder(String username, String folderCode);

    void grantPermission(String username, String folderCode);

    void revokePermission(String username, String folderCode);

    void batchUpdatePermissions(String username, List<String> grantCodes, List<String> revokeCodes);

    List<FolderPermissionVO> getUserPermissions(String username);
}
