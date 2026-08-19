package com.devsync.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Rate limits endpoints that can be abused for spam: sending project
 * invitations, requesting to join private projects, joining public projects,
 * following/unfollowing users, and submitting moderation reports.
 *
 * The filter runs INSIDE the Spring Security chain (after authentication) so
 * it can key on the authenticated user id — one account spamming invitations
 * cannot be masked by rotating IPs, and one IP cannot exhaust a quota shared
 * across its users. Unauthenticated requests are keyed by IP.
 *
 * Limits are configured per route prefix. Defaults:
 *   project invite/join/join-request POSTs → 10 per minute
 *   connection follow/unfollow POSTs       → 30 per minute
 *   moderation report POSTs                → 5 per minute
 *
 * ⚠️ Backed by the shared {@link RateLimiter} (in-memory by default — swap the
 * bean for Redis in clustered production).
 */
public class SpamProtectionFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;
    private final boolean enabled;
    private final boolean trustXForwardedFor;
    private final Map<String, Integer> routeLimits;

    public SpamProtectionFilter(RateLimiter rateLimiter, boolean enabled,
                                int perMinuteLimit, boolean trustXForwardedFor) {
        this(rateLimiter, enabled, trustXForwardedFor, Map.of(
                "projects", perMinuteLimit,
                "connections", 30,
                "reports", 5
        ));
    }

    public SpamProtectionFilter(RateLimiter rateLimiter, boolean enabled,
                                boolean trustXForwardedFor, Map<String, Integer> routeLimits) {
        this.rateLimiter = rateLimiter;
        this.enabled = enabled;
        this.trustXForwardedFor = trustXForwardedFor;
        this.routeLimits = routeLimits;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || !"POST".equalsIgnoreCase(request.getMethod()) || routeKey(request.getRequestURI()) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String key = "spam:" + routeKey(request.getRequestURI()) + ":" + identity(request);
        int limit = routeLimits.get(routeKey(request.getRequestURI()));
        if (!rateLimiter.tryAcquire(key, limit, 60)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.setHeader("Retry-After", "60");
            response.getWriter().write(
                    "{\"success\":false,\"error\":\"Too many requests. Please try again later.\"}"
            );
            return;
        }
        filterChain.doFilter(request, response);
    }

    /**
     * Returns the route bucket for a path, or null if the path is not
     * rate-limited by this filter.
     */
    private String routeKey(String path) {
        if (path == null) return null;
        if (path.equals("/api/reports")) return "reports";
        if (path.equals("/api/connections/follow") || path.equals("/api/connections/unfollow")) {
            return "connections";
        }
        if (path.startsWith("/api/projects/")) {
            String[] segments = path.split("/");
            // ["", "api", "projects", "{id}", "action"]
            if (segments.length == 5
                    && ("invite".equals(segments[4]) || "join".equals(segments[4]) || "join-request".equals(segments[4]))) {
                return "projects";
            }
        }
        return null;
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
