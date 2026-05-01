package com.hepr.cms.attachment.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String store(MultipartFile file, String storageKey);
    Resource load(String storageKey);
    void delete(String storageKey);
    String getUrl(String storageKey);
    String getStorageType();
}
