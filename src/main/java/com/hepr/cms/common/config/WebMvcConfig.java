package com.hepr.cms.common.config;

import com.hepr.cms.auth.AuthInterceptor;
import com.hepr.cms.common.model.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${cms.storage.local.base-path:./uploads}")
    private String uploadBasePath;

    private final AuthInterceptor authInterceptor;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absolutePath = Paths.get(uploadBasePath).toAbsolutePath().normalize().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absolutePath + "/");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/login", "/uploads/**");
    }

    @Controller
    public static class SpaErrorController implements ErrorController {

        @RequestMapping("/error")
        public Object handleError() {
            ClassPathResource indexHtml = new ClassPathResource("static/index.html");
            if (indexHtml.exists()) {
                return "forward:/index.html";
            }
            return Result.fail(404, "资源不存在");
        }
    }
}
