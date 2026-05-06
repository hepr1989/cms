package com.hepr.cms.attachment.service.impl;

import com.hepr.cms.attachment.service.StorageService;
import com.hepr.cms.common.exception.BusinessException;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Service
@ConditionalOnProperty(name = "cms.storage.type", havingValue = "minio")
@RequiredArgsConstructor
public class MinioStorageService implements StorageService {

    @Value("${cms.storage.minio.bucket:cms}")
    private String bucket;

    private final MinioClient minioClient;

    @Override
    public String store(MultipartFile file, String storageKey) {
        try {
            ensureBucket();
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(storageKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build());
            return storageKey;
        } catch (Exception e) {
            throw new BusinessException(500, "MinIO文件存储失败：" + e.getMessage());
        }
    }

    @Override
    public String store(InputStream inputStream, long size, String contentType, String storageKey) {
        try {
            ensureBucket();
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(storageKey)
                            .stream(inputStream, size, -1)
                            .contentType(contentType)
                            .build());
            return storageKey;
        } catch (Exception e) {
            throw new BusinessException(500, "MinIO文件存储失败：" + e.getMessage());
        }
    }

    private void ensureBucket() throws Exception {
        if (!minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    @Override
    public Resource load(String storageKey) {
        try {
            InputStream inputStream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(storageKey)
                            .build());
            return new InputStreamResource(inputStream);
        } catch (Exception e) {
            throw new BusinessException(404, "文件不存在：" + e.getMessage());
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(storageKey)
                            .build());
        } catch (Exception e) {
            // log and ignore
        }
    }

    @Override
    public String getUrl(String storageKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .bucket(bucket)
                            .object(storageKey)
                            .method(io.minio.http.Method.GET)
                            .expiry(7, TimeUnit.DAYS)
                            .build());
        } catch (Exception e) {
            throw new BusinessException(500, "获取文件URL失败：" + e.getMessage());
        }
    }

    @Override
    public String getStorageType() {
        return "minio";
    }
}
