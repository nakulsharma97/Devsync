package com.devsync.ratelimit;

/**
 * Pluggable rate limiter. The default implementation is
 * {@link InMemoryFixedWindowRateLimiter} — correct for a single instance and
 * for development, but state is local and resets on restart. For a clustered
 * production deployment, provide a {@code RateLimiter} bean backed by Redis
 * (e.g. {@code INCR} + {@code EXPIRE}) — nothing else in the codebase needs
 * to change.
 */
public interface RateLimiter {

    /**
     * Attempts to acquire a slot for {@code key} under a fixed window.
     *
     * @param key           the caller identity (e.g. {@code auth:192.0.2.1} or
     *                      {@code invite:user-42})
     * @param limit         maximum allowed requests per window
     * @param windowSeconds window length in seconds
     * @return true if the request is within the limit, false if it should be rejected
     */
    boolean tryAcquire(String key, int limit, long windowSeconds);
}
