package com.hepr.cms.attachment.service.impl;

import com.hepr.cms.attachment.service.StorageService;
import com.hepr.cms.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@ConditionalOnProperty(name = "cms.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    @Value("${cms.storage.local.base-path:./uploads}")
    private String basePath;

    private Path basePathDir;

    @PostConstruct
    public void init() {
        basePathDir = Paths.get(basePath).toAbsolutePath().normalize();
    }

    @Override
    public String store(MultipartFile file, String storageKey) {
        try {
            Path targetPath = basePathDir.resolve(storageKey);
            Files.createDirectories(targetPath.getParent());
            Files.copy(file.getInputStream(), targetPath);
            return storageKey;
        } catch (IOException e) {
            throw new BusinessException(500, "文件存储失败：" + e.getMessage());
        }
    }

    @Override
    public String store(InputStream inputStream, long size, String contentType, String storageKey) {
        try {
            Path targetPath = basePathDir.resolve(storageKey);
            Files.createDirectories(targetPath.getParent());
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            return storageKey;
        } catch (IOException e) {
            throw new BusinessException(500, "文件存储失败：" + e.getMessage());
        }
    }

    @Override
    public Resource load(String storageKey) {
        Path path = basePathDir.resolve(storageKey);
        Resource resource = new FileSystemResource(path);
        if (!resource.exists()) throw new BusinessException(404, "文件不存在");
        return resource;
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(basePathDir.resolve(storageKey));
        } catch (IOException e) {
            // log and ignore
        }
    }

    @Override
    public String getUrl(String storageKey) {
        return "/uploads/" + storageKey;
    }

    @Override
    public String getStorageType() {
        return "local";
    }
}
