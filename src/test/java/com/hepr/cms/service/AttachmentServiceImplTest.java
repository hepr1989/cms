package com.hepr.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.attachment.entity.Attachment;
import com.hepr.cms.attachment.entity.AttachmentRef;
import com.hepr.cms.attachment.mapper.AttachmentMapper;
import com.hepr.cms.attachment.mapper.AttachmentRefMapper;
import com.hepr.cms.attachment.service.StorageService;
import com.hepr.cms.attachment.service.impl.AttachmentServiceImpl;
import com.hepr.cms.attachment.vo.AttachmentVO;
import com.hepr.cms.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceImplTest {

    @Mock
    private AttachmentMapper attachmentMapper;
    @Mock
    private AttachmentRefMapper attachmentRefMapper;
    @Mock
    private StorageService storageService;
    @InjectMocks
    private AttachmentServiceImpl attachmentService;

    @Test
    void upload_文件过大_抛异常() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf",
                new byte[11 * 1024 * 1024]); // 11MB

        assertThatThrownBy(() -> attachmentService.upload(file, "article", "ac_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("文件大小");
    }

    @Test
    void upload_正常上传_成功() {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain",
                "hello".getBytes());
        when(storageService.getUrl(anyString())).thenReturn("/uploads/test.txt");

        AttachmentVO result = attachmentService.upload(file, "article", "ac_001");

        assertThat(result).isNotNull();
        verify(attachmentMapper).insert(any(Attachment.class));
        verify(attachmentRefMapper).insert(any(AttachmentRef.class));
    }

    @Test
    void getByCode_不存在_抛404() {
        when(attachmentMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        assertThatThrownBy(() -> attachmentService.getByCode("not_exist"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(404));
    }

    @Test
    void delete_成功删除附件和引用() {
        Attachment attachment = new Attachment();
        attachment.setId(1L);
        attachment.setAttachmentCode("at_001");
        attachment.setStorageKey("2026-04/test.txt");

        when(attachmentMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(attachment);
        when(attachmentMapper.deleteById(1L)).thenReturn(1);
        when(attachmentRefMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        attachmentService.delete("at_001");

        verify(storageService).delete("2026-04/test.txt");
        verify(attachmentMapper).deleteById(1L);
    }
}
