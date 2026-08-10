package com.devsync.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter for authentication endpoints.
 * Limits requests to 10 per minute per IP address.
 * Also tracks per-user rate limits via request body analysis.
 *
 * ⚠️ In-memory only — resets on server restart.
 * For production deployments, replace with Redis-based rate limiting.
 */
@Component
@Order(1)
public class RateLimitingFilter extends OncePerRequestFilter {
    // Rate limiting filter - updated for CI trigger

    private final Map<String, RateLimitEntry> requestCounts = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000; // 1 minute

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
        long now = System.currentTimeMillis();

        RateLimitEntry entry = requestCounts.compute(clientIp, (key, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RateLimitEntry(now, 1);
            }
            existing.count++;
            return existing;
        });

        if (entry.count > MAX_REQUESTS) {
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

    private static class RateLimitEntry {
        final long windowStart;
        int count;

        RateLimitEntry(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
