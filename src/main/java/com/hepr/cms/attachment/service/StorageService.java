package com.hepr.cms.attachment.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

public interface StorageService {
    String store(MultipartFile file, String storageKey);
    String store(InputStream inputStream, long size, String contentType, String storageKey);
    Resource load(String storageKey);
    void delete(String storageKey);
    String getUrl(String storageKey);
    String getStorageType();
}
