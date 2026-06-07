package com.hepr.cms.auth;

import com.hepr.cms.common.security.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 认证拦截器：
 * - GET 请求全部放行（前台/后台共用 GET 接口）
 * - POST/PUT/DELETE 请求要求有效 JWT Token
 * - Token 有效时设置 UserContext，剩余不足1天时滑动刷新
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // OPTIONS 预检请求放行
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // GET 请求放行（前台公开 + 后台读取）
        if ("GET".equalsIgnoreCase(request.getMethod())) {
            // 但仍然尝试解析 token 设置 UserContext（用于 MetaObjectHandler）
            trySetUserContext(request);
            return true;
        }

        // POST/PUT/DELETE 需要认证
        String token = extractToken(request);
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"message\":\"未登录或登录已过期\"}");
            return false;
        }

        // 设置 UserContext
        String username = jwtTokenProvider.getUsername(token);
        String role = jwtTokenProvider.getRole(token);
        UserContext.set(username, role);

        // 滑动刷新：剩余 < 1天 时返回新 token
        if (jwtTokenProvider.needsRefresh(token)) {
            String newToken = jwtTokenProvider.generateToken(username, role);
            response.setHeader("X-New-Token", newToken);
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // 清理 ThreadLocal，防止泄漏
        UserContext.clear();
    }

    private void trySetUserContext(HttpServletRequest request) {
        String token = extractToken(request);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            String username = jwtTokenProvider.getUsername(token);
            String role = jwtTokenProvider.getRole(token);
            UserContext.set(username, role);
            // 滑动刷新
            if (jwtTokenProvider.needsRefresh(token)) {
                // GET 请求无法通过 HttpServletResponse 在拦截器中设置 header 后继续，
                // 这里不做刷新，刷新仅在写操作时触发
            }
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
