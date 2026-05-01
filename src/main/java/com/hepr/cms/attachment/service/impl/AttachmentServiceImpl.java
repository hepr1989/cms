package com.hepr.cms.attachment.service.impl;

import com.hepr.cms.common.util.BeanCopyUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.hepr.cms.attachment.entity.Attachment;
import com.hepr.cms.attachment.entity.AttachmentRef;
import com.hepr.cms.attachment.mapper.AttachmentMapper;
import com.hepr.cms.attachment.mapper.AttachmentRefMapper;
import com.hepr.cms.attachment.service.AttachmentService;
import com.hepr.cms.attachment.service.StorageService;
import com.hepr.cms.attachment.vo.AttachmentVO;
import com.hepr.cms.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttachmentServiceImpl implements AttachmentService {

    private final AttachmentMapper attachmentMapper;
    private final AttachmentRefMapper attachmentRefMapper;
    private final StorageService storageService;

    @Override
    @Transactional
    public AttachmentVO upload(MultipartFile file, String refType, String refCode) {
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BusinessException(413, "文件大小不能超过10MB");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";

        String yyyyMM = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String storageKey = yyyyMM + "/" + UUID.randomUUID() + ext;
        storageService.store(file, storageKey);

        Attachment attachment = new Attachment();
        attachment.setAttachmentCode(IdWorker.getIdStr());
        attachment.setFileName(originalFilename);
        attachment.setFileUrl(storageService.getUrl(storageKey));
        attachment.setFileSize(file.getSize());
        attachment.setStorageType(storageService.getStorageType());
        attachment.setStorageKey(storageKey);
        attachmentMapper.insert(attachment);

        if (StringUtils.hasText(refType) && StringUtils.hasText(refCode)) {
            AttachmentRef ref = new AttachmentRef();
            ref.setRefCode(refCode);
            ref.setRefType(refType);
            ref.setAttachmentCode(attachment.getAttachmentCode());
            attachmentRefMapper.insert(ref);
        }

        return populateDownloadUrl(BeanCopyUtil.copyProperties(attachment, AttachmentVO.class));
    }

    @Override
    public AttachmentVO getByCode(String attachmentCode) {
        Attachment attachment = attachmentMapper.selectOne(
                new LambdaQueryWrapper<Attachment>().eq(Attachment::getAttachmentCode, attachmentCode));
        if (attachment == null) throw new BusinessException(404, "附件不存在");
        AttachmentVO vo = BeanCopyUtil.copyProperties(attachment, AttachmentVO.class);
        vo.setFileUrl(storageService.getUrl(attachment.getStorageKey()));
        return populateDownloadUrl(vo);
    }

    @Override
    public Resource loadResource(String attachmentCode) {
        Attachment attachment = attachmentMapper.selectOne(
                new LambdaQueryWrapper<Attachment>().eq(Attachment::getAttachmentCode, attachmentCode));
        if (attachment == null) throw new BusinessException(404, "附件不存在");
        return storageService.load(attachment.getStorageKey());
    }

    @Override
    @Transactional
    public void delete(String attachmentCode) {
        Attachment attachment = attachmentMapper.selectOne(
                new LambdaQueryWrapper<Attachment>().eq(Attachment::getAttachmentCode, attachmentCode));
        if (attachment == null) throw new BusinessException(404, "附件不存在");

        storageService.delete(attachment.getStorageKey());
        attachmentMapper.deleteById(attachment.getId());

        attachmentRefMapper.delete(
                new LambdaQueryWrapper<AttachmentRef>().eq(AttachmentRef::getAttachmentCode, attachmentCode));
    }

    @Override
    public List<AttachmentVO> getByRef(String refType, String refCode) {
        List<AttachmentRef> refs = attachmentRefMapper.selectList(
                new LambdaQueryWrapper<AttachmentRef>()
                        .eq(AttachmentRef::getRefType, refType)
                        .eq(AttachmentRef::getRefCode, refCode));
        if (refs.isEmpty()) return Collections.emptyList();

        List<String> codes = refs.stream()
                .map(AttachmentRef::getAttachmentCode).collect(Collectors.toList());
        List<Attachment> attachments = attachmentMapper.selectList(
                new LambdaQueryWrapper<Attachment>().in(Attachment::getAttachmentCode, codes));
        return attachments.stream()
                .map(a -> {
                    AttachmentVO vo = BeanCopyUtil.copyProperties(a, AttachmentVO.class);
                    vo.setFileUrl(storageService.getUrl(a.getStorageKey()));
                    return populateDownloadUrl(vo);
                })
                .collect(Collectors.toList());
    }

    private AttachmentVO populateDownloadUrl(AttachmentVO vo) {
        if (vo != null && vo.getAttachmentCode() != null) {
            vo.setDownloadUrl("/api/attachments/" + vo.getAttachmentCode() + "/download");
        }
        return vo;
    }
}
