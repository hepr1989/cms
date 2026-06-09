package com.hepr.cms.common.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * 应用启动后预热数据库连接池，避免首次请求因建立连接而延迟
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConnectionPoolWarmup implements ApplicationRunner {

    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            conn.prepareStatement("SELECT 1").executeQuery();
            log.info("数据库连接池预热完成");
        } catch (Exception e) {
            log.warn("数据库连接池预热失败: {}", e.getMessage());
        }
    }
}
