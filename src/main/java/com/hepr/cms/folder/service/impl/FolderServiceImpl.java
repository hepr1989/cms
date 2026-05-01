package com.hepr.cms.folder.service.impl;

import com.hepr.cms.common.util.BeanCopyUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.hepr.cms.article.service.ArticleService;
import com.hepr.cms.article.vo.ArticleVO;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.folder.dto.FolderCreateDTO;
import com.hepr.cms.folder.dto.FolderSortDTO;
import com.hepr.cms.folder.dto.FolderUpdateDTO;
import com.hepr.cms.folder.entity.Folder;
import com.hepr.cms.folder.mapper.FolderMapper;
import com.hepr.cms.folder.service.FolderService;
import com.hepr.cms.folder.vo.FolderTreeVO;
import com.hepr.cms.folder.vo.FolderVO;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderServiceImpl implements FolderService {

    private final FolderMapper folderMapper;
    @Lazy
    private final ArticleService articleService;

    private Map<String, Integer> extractCountMap(List<String> folderCodes) {
        Map<String, Map<String, Object>> rawMap = folderMapper.countChildrenByParentCodes(folderCodes);
        if (rawMap == null) return Collections.emptyMap();
        Map<String, Integer> result = new HashMap<>();
        for (Map.Entry<String, Map<String, Object>> entry : rawMap.entrySet()) {
            Object cnt = entry.getValue().get("cnt");
            result.put(entry.getKey(), cnt != null ? ((Number) cnt).intValue() : 0);
        }
        return result;
    }

    @Override
    public List<FolderVO> getRootFolders() {
        return getRootFolders(false);
    }

    @Override
    public List<FolderVO> getRootFolders(boolean portalMode) {
        List<Folder> folders = folderMapper.selectList(
                new LambdaQueryWrapper<Folder>()
                        .eq(Folder::getParentFolderCode, "-1")
                        .eq(Folder::getStatus, 1)
                        .orderByAsc(Folder::getSort));

        if (folders.isEmpty()) return Collections.emptyList();

        List<String> folderCodes = folders.stream().map(Folder::getFolderCode).collect(Collectors.toList());
        Map<String, Integer> countMap = extractCountMap(folderCodes);
        Map<String, Integer> articleCountMap = articleService.countByFolderCodes(folderCodes, portalMode);

        return folders.stream().map(f -> {
            FolderVO vo = BeanCopyUtil.copyProperties(f, FolderVO.class);
            vo.setChildrenCount(countMap.getOrDefault(f.getFolderCode(), 0));
            vo.setArticleCount(articleCountMap.getOrDefault(f.getFolderCode(), 0));
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public FolderTreeVO getChildren(String parentFolderCode, boolean portalMode) {
        List<Folder> folders = folderMapper.selectList(
                new LambdaQueryWrapper<Folder>()
                        .eq(Folder::getParentFolderCode, parentFolderCode)
                        .eq(Folder::getStatus, 1)
                        .orderByAsc(Folder::getSort));

        Map<String, Integer> countMap = Collections.emptyMap();
        Map<String, Integer> articleCountMap = Collections.emptyMap();
        if (!folders.isEmpty()) {
            List<String> folderCodes = folders.stream().map(Folder::getFolderCode).collect(Collectors.toList());
            countMap = extractCountMap(folderCodes);
            articleCountMap = articleService.countByFolderCodes(folderCodes, portalMode);
        }

        Map<String, Integer> finalCountMap = countMap;
        Map<String, Integer> finalArticleCountMap = articleCountMap;
        List<FolderVO> folderVOs = folders.stream().map(f -> {
            FolderVO vo = BeanCopyUtil.copyProperties(f, FolderVO.class);
            vo.setChildrenCount(finalCountMap.getOrDefault(f.getFolderCode(), 0));
            vo.setArticleCount(finalArticleCountMap.getOrDefault(f.getFolderCode(), 0));
            return vo;
        }).collect(Collectors.toList());

        List<ArticleVO> articleVOs = articleService.listByFolderCode(parentFolderCode, portalMode);

        FolderTreeVO treeVO = new FolderTreeVO();
        treeVO.setFolders(folderVOs);
        treeVO.setArticles(articleVOs);
        return treeVO;
    }

    @Override
    @Transactional
    public FolderVO create(FolderCreateDTO dto) {
        String parentCode = StringUtils.hasText(dto.getParentFolderCode()) ? dto.getParentFolderCode() : "-1";

        if (!"-1".equals(parentCode)) {
            Folder parent = folderMapper.selectOne(
                    new LambdaQueryWrapper<Folder>()
                            .eq(Folder::getFolderCode, parentCode)
                            .eq(Folder::getStatus, 1));
            if (parent == null) {
                throw new BusinessException(400, "父目录不存在或已不可用");
            }
        }

        Folder folder = new Folder();
        folder.setFolderCode(IdWorker.getIdStr());
        folder.setTitle(dto.getTitle());
        folder.setParentFolderCode(parentCode);
        folder.setDescription(dto.getDescription());

        Folder maxSortFolder = folderMapper.selectOne(
                new LambdaQueryWrapper<Folder>()
                        .eq(Folder::getParentFolderCode, parentCode)
                        .orderByDesc(Folder::getSort)
                        .last("LIMIT 1"));
        folder.setSort(maxSortFolder != null ? maxSortFolder.getSort() + 1 : 0);
        folder.setStatus(1);

        folderMapper.insert(folder);
        return BeanCopyUtil.copyProperties(folder, FolderVO.class);
    }

    @Override
    @Transactional
    public FolderVO update(FolderUpdateDTO dto) {
        Folder folder = folderMapper.selectOne(
                new LambdaQueryWrapper<Folder>().eq(Folder::getFolderCode, dto.getFolderCode()));
        if (folder == null) throw new BusinessException(404, "目录不存在");

        folder.setTitle(dto.getTitle());
        folder.setDescription(dto.getDescription());
        folder.setStatus(dto.getStatus());
        folderMapper.updateById(folder);
        return BeanCopyUtil.copyProperties(folder, FolderVO.class);
    }

    @Override
    @Transactional
    public void delete(String folderCode) {
        Folder folder = folderMapper.selectOne(
                new LambdaQueryWrapper<Folder>().eq(Folder::getFolderCode, folderCode));
        if (folder == null) throw new BusinessException(404, "目录不存在");

        Long subFolderCount = folderMapper.selectCount(
                new LambdaQueryWrapper<Folder>()
                        .eq(Folder::getParentFolderCode, folderCode)
                        .eq(Folder::getStatus, 1));
        if (subFolderCount > 0) {
            throw new BusinessException(400, "目录下存在子目录，无法删除");
        }

        long articleCount = articleService.countByFolderCode(folderCode);
        if (articleCount > 0) {
            throw new BusinessException(400, "目录下存在文章，无法删除");
        }

        folderMapper.deleteById(folder.getId());
    }

    @Override
    @Transactional
    public void updateSort(FolderSortDTO dto) {
        Folder moving = folderMapper.selectOne(
                new LambdaQueryWrapper<Folder>().eq(Folder::getFolderCode, dto.getMovingCode()));
        Folder target = folderMapper.selectOne(
                new LambdaQueryWrapper<Folder>().eq(Folder::getFolderCode, dto.getTargetCode()));
        if (moving == null || target == null) throw new BusinessException(404, "目录不存在");
        if (!moving.getParentFolderCode().equals(target.getParentFolderCode())) {
            throw new BusinessException(400, "只能在同一层级内排序");
        }

        String parentCode = moving.getParentFolderCode();
        if ("BEFORE".equals(dto.getPosition())) {
            folderMapper.incrementSortGte(parentCode, target.getSort(), dto.getMovingCode());
            folderMapper.updateSortByCode(dto.getMovingCode(), target.getSort());
        } else {
            folderMapper.incrementSortGt(parentCode, target.getSort(), dto.getMovingCode());
            folderMapper.updateSortByCode(dto.getMovingCode(), target.getSort() + 1);
        }
    }

    @Override
    public FolderVO getByCode(String folderCode) {
        Folder folder = folderMapper.selectOne(
                new LambdaQueryWrapper<Folder>().eq(Folder::getFolderCode, folderCode));
        return folder != null ? BeanCopyUtil.copyProperties(folder, FolderVO.class) : null;
    }

    @Override
    public boolean existsAndActive(String folderCode) {
        return folderMapper.selectCount(
                new LambdaQueryWrapper<Folder>()
                        .eq(Folder::getFolderCode, folderCode)
                        .eq(Folder::getStatus, 1)) > 0;
    }
}
