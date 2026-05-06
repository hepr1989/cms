package com.hepr.cms.attachment.service;

import com.hepr.cms.attachment.vo.AttachmentVO;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface AttachmentService {
    AttachmentVO upload(MultipartFile file, String refType, String refCode);
    AttachmentVO uploadFromBytes(byte[] data, String fileName, String contentType, String refType, String refCode);
    AttachmentVO getByCode(String attachmentCode);
    Resource loadResource(String attachmentCode);
    void delete(String attachmentCode);
    List<AttachmentVO> getByRef(String refType, String refCode);
}
