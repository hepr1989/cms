package com.hepr.cms.article.service.pdfimport;

import org.springframework.web.multipart.MultipartFile;

public interface PdfImportService {
    PdfImportResult convertToMarkdown(MultipartFile pdfFile, String articleCode);
}
