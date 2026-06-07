package com.hepr.cms.common.exception;

/**
 * 未授权异常（HTTP 401）
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException() {
        super("未登录或登录已过期");
    }
}
