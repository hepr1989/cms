package com.hepr.cms.folder.service;

import com.hepr.cms.folder.dto.FolderCreateDTO;
import com.hepr.cms.folder.dto.FolderSortDTO;
import com.hepr.cms.folder.dto.FolderUpdateDTO;
import com.hepr.cms.folder.vo.FolderTreeVO;
import com.hepr.cms.folder.vo.FolderVO;

import java.util.List;

public interface FolderService {
    List<FolderVO> getRootFolders();
    List<FolderVO> getRootFolders(boolean portalMode);
    FolderTreeVO getChildren(String folderCode, boolean portalMode);
    FolderVO create(FolderCreateDTO dto);
    FolderVO update(FolderUpdateDTO dto);
    void delete(String folderCode);
    void updateSort(FolderSortDTO dto);

    FolderVO getByCode(String folderCode);
    boolean existsAndActive(String folderCode);
}
