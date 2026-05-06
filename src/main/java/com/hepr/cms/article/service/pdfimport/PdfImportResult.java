package com.hepr.cms.article.service.pdfimport;

import com.hepr.cms.attachment.vo.AttachmentVO;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class PdfImportResult {
    private String title;
    private String markdown;
    private List<AttachmentVO> attachments = new ArrayList<>();
}
