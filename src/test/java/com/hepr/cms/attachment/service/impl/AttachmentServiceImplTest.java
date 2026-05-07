package com.hepr.cms.attachment.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.attachment.entity.Attachment;
import com.hepr.cms.attachment.entity.AttachmentRef;
import com.hepr.cms.attachment.mapper.AttachmentMapper;
import com.hepr.cms.attachment.mapper.AttachmentRefMapper;
import com.hepr.cms.attachment.service.StorageService;
import com.hepr.cms.attachment.vo.AttachmentVO;
import com.hepr.cms.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

    /** 超过大小上限时拒绝上传 */
    @Test
    void upload_whenFileExceedsLimit_throws() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf",
                new byte[11 * 1024 * 1024]);

        assertThatThrownBy(() -> attachmentService.upload(file, "article", "ac_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("文件大小");
    }

    /** 正常上传时写入附件与引用关系 */
    @Test
    void upload_whenValid_returnsVoAndPersists() {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain",
                "hello".getBytes());
        when(storageService.getUrl(anyString())).thenReturn("/uploads/test.txt");

        AttachmentVO result = attachmentService.upload(file, "article", "ac_001");

        assertThat(result).isNotNull();
        verify(attachmentMapper).insert(any(Attachment.class));
        verify(attachmentRefMapper).insert(any(AttachmentRef.class));
    }

    /** 附件编码不存在时返回 404 */
    @Test
    void getByCode_whenMissing_throws404() {
        when(attachmentMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Attachment>>any())).thenReturn(null);

        assertThatThrownBy(() -> attachmentService.getByCode("not_exist"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(404));
    }

    /** 删除附件时清理对象存储、主表及引用表 */
    @Test
    void delete_removesStorageFileAndRows() {
        Attachment attachment = new Attachment();
        attachment.setId(1L);
        attachment.setAttachmentCode("at_001");
        attachment.setStorageKey("2026-04/test.txt");

        when(attachmentMapper.selectOne(ArgumentMatchers.<LambdaQueryWrapper<Attachment>>any())).thenReturn(attachment);
        when(attachmentMapper.deleteById(1L)).thenReturn(1);

        attachmentService.delete("at_001");

        verify(storageService).delete("2026-04/test.txt");
        verify(attachmentMapper).deleteById(1L);
        verify(attachmentRefMapper).delete(ArgumentMatchers.<LambdaQueryWrapper<AttachmentRef>>any());
    }
}
