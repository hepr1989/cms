package com.hepr.cms.common.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "cms.storage.type", havingValue = "minio")
public class MinioConfig {

    @Bean
    public MinioClient minioClient(
            @Value("${cms.storage.minio.endpoint}") String endpoint,
            @Value("${cms.storage.minio.access-key}") String accessKey,
            @Value("${cms.storage.minio.secret-key}") String secretKey) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
