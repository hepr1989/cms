package com.hepr.cms.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT Token 工具：生成、解析、验证、滑动刷新。
 */
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${cms.jwt.secret}") String secret,
            @Value("${cms.jwt.expiration:604800000}") long expirationMs) {
        // secret 至少 256 bit (32 bytes)
        byte[] keyBytes = new byte[32];
        byte[] src = secret.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(src, 0, keyBytes, 0, Math.min(src.length, keyBytes.length));
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
    }

    /**
     * 生成 JWT Token
     */
    public String generateToken(String username, String role) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(exp)
                .signWith(key)
                .compact();
    }

    /**
     * 解析 token，返回 Claims；解析失败返回 null
     */
    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * 验证 token 是否有效（未过期、签名正确）
     */
    public boolean validateToken(String token) {
        Claims claims = parseToken(token);
        return claims != null && !claims.getExpiration().before(new Date());
    }

    /**
     * 从 token 中提取用户名
     */
    public String getUsername(String token) {
        Claims claims = parseToken(token);
        return claims != null ? claims.getSubject() : null;
    }

    /**
     * 从 token 中提取角色
     */
    public String getRole(String token) {
        Claims claims = parseToken(token);
        return claims != null ? claims.get("role", String.class) : null;
    }

    /**
     * 判断是否需要滑动刷新（剩余有效期 < 1 天）
     */
    public boolean needsRefresh(String token) {
        Claims claims = parseToken(token);
        if (claims == null) return false;
        long remaining = claims.getExpiration().getTime() - System.currentTimeMillis();
        return remaining < 86400000L; // 1天 = 86400000ms
    }
}
