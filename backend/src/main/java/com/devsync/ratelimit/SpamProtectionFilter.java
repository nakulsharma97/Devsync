package com.devsync.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate limits endpoints that can be abused for spam: sending project
 * invitations, requesting to join private projects, and joining public
 * projects.
 *
 * The filter runs INSIDE the Spring Security chain (after authentication) so
 * it can key on the authenticated user id — one account spamming invitations
 * cannot be masked by rotating IPs, and one IP cannot exhaust a quota shared
 * across its users. Unauthenticated requests are keyed by IP.
 *
 * ⚠️ Backed by the shared {@link RateLimiter} (in-memory by default — swap the
 * bean for Redis in clustered production).
 */
public class SpamProtectionFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;
    private final boolean enabled;
    private final int perMinuteLimit;
    private final boolean trustXForwardedFor;

    public SpamProtectionFilter(RateLimiter rateLimiter, boolean enabled,
                                int perMinuteLimit, boolean trustXForwardedFor) {
        this.rateLimiter = rateLimiter;
        this.enabled = enabled;
        this.perMinuteLimit = perMinuteLimit;
        this.trustXForwardedFor = trustXForwardedFor;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || !"POST".equalsIgnoreCase(request.getMethod()) || !isTargetedPath(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String key = "invite:" + identity(request);
        if (!rateLimiter.tryAcquire(key, perMinuteLimit, 60)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"success\":false,\"error\":\"Too many requests. Please try again later.\"}"
            );
            return;
        }
        filterChain.doFilter(request, response);
    }

    /**
     * POST /api/projects/{projectId}/invite | /join | /join-request
     */
    private boolean isTargetedPath(String path) {
        if (path == null || !path.startsWith("/api/projects/")) return false;
        String[] segments = path.split("/");
        // ["", "api", "projects", "{id}", "action"]
        return segments.length == 5
                && ("invite".equals(segments[4]) || "join".equals(segments[4]) || "join-request".equals(segments[4]));
    }

    private String identity(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null
                && !"anonymousUser".equals(auth.getName())) {
            return "user:" + auth.getName();
        }
        return "ip:" + clientIp(request);
    }

    private String clientIp(HttpServletRequest request) {
        if (trustXForwardedFor) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
