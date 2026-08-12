package com.devsync.auth;

import com.devsync.ratelimit.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate limiter for authentication endpoints.
 * Limits requests to 10 per minute per IP address.
 *
 * ⚠️ The backing {@link RateLimiter} is in-memory by default — resets on server
 * restart and is not shared across instances. For production deployments,
 * replace the {@code RateLimiter} bean with a Redis-backed implementation
 * (see com.devsync.ratelimit.RateLimiter).
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_SECONDS = 60; // 1 minute

    private final RateLimiter rateLimiter;

    /**
     * Whether to trust the X-Forwarded-For header. Only enable this when the app
     * sits behind a reverse proxy you control. Default false — the header is
     * trivially spoofable when the app is reachable directly, which would let
     * attackers bypass the rate limit entirely.
     */
    @org.springframework.beans.factory.annotation.Value("${app.rate-limit.trust-x-forwarded-for:false}")
    private boolean trustXForwardedFor;

    @org.springframework.beans.factory.annotation.Value("${app.rate-limit.enabled:true}")
    private boolean enabled;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Only rate-limit auth endpoints; can be disabled behind a dedicated
        // edge limiter (app.rate-limit.enabled=false).
        if (!enabled || !path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        if (!rateLimiter.tryAcquire("auth:" + clientIp, MAX_REQUESTS, WINDOW_SECONDS)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false,\"error\":\"Too many requests. Please try again later.\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        // X-Forwarded-For is spoofable unless the app is behind a trusted proxy.
        // Never trust it by default.
        if (trustXForwardedFor) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
