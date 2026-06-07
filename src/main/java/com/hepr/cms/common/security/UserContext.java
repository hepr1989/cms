package com.hepr.cms.common.security;

/**
 * ThreadLocal 存储当前登录用户上下文信息。
 * 由 AuthInterceptor 在请求进入时设置，请求结束时清理。
 */
public final class UserContext {

    private static final ThreadLocal<Context> HOLDER = new ThreadLocal<>();

    private UserContext() {}

    public static void set(String username, String role) {
        HOLDER.set(new Context(username, role));
    }

    public static String getUsername() {
        Context ctx = HOLDER.get();
        return ctx != null ? ctx.username() : null;
    }

    public static String getRole() {
        Context ctx = HOLDER.get();
        return ctx != null ? ctx.role() : null;
    }

    public static boolean isAdmin() {
        return "ADMIN".equals(getRole());
    }

    public static boolean isLoggedIn() {
        return HOLDER.get() != null;
    }

    public static void clear() {
        HOLDER.remove();
    }

    private record Context(String username, String role) {}
}
