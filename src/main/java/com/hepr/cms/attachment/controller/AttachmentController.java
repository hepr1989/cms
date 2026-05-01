package com.hepr.cms.attachment.controller;

import com.hepr.cms.attachment.service.AttachmentService;
import com.hepr.cms.attachment.vo.AttachmentVO;
import com.hepr.cms.common.model.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping("/upload")
    public Result<AttachmentVO> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String refType,
            @RequestParam(required = false) String refCode) {
        return Result.ok(attachmentService.upload(file, refType, refCode));
    }

    @GetMapping("/{attachmentCode}")
    public Result<AttachmentVO> getByCode(@PathVariable String attachmentCode) {
        return Result.ok(attachmentService.getByCode(attachmentCode));
    }

    @DeleteMapping("/{attachmentCode}")
    public Result<Void> delete(@PathVariable String attachmentCode) {
        attachmentService.delete(attachmentCode);
        return Result.ok();
    }

    @GetMapping("/query")
    public Result<List<AttachmentVO>> getByRef(
            @RequestParam String refType,
            @RequestParam String refCode) {
        return Result.ok(attachmentService.getByRef(refType, refCode));
    }

    @GetMapping("/{attachmentCode}/download")
    public ResponseEntity<Resource> download(@PathVariable String attachmentCode) {
        AttachmentVO attachment = attachmentService.getByCode(attachmentCode);
        Resource resource = attachmentService.loadResource(attachmentCode);

        String encodedFileName = URLEncoder.encode(attachment.getFileName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                .body(resource);
    }
}
