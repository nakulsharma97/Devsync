package com.devsync.ratelimit;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window, in-memory {@link RateLimiter}.
 *
 * ⚠️ Single-instance only: state lives in this JVM, is not shared across
 * replicas, and resets on restart. Behind a single reverse proxy this is
 * acceptable; for a horizontally scaled deployment swap this bean for a
 * Redis-backed implementation of {@link RateLimiter}.
 */
@Component
public class InMemoryFixedWindowRateLimiter implements RateLimiter {

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private long sweepCounter;

    @Override
    public boolean tryAcquire(String key, int limit, long windowSeconds) {
        long now = System.currentTimeMillis();
        long windowMs = Math.max(windowSeconds, 1) * 1000L;

        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.startedAt >= windowMs) {
                return new Window(now, 1);
            }
            existing.count++;
            return existing;
        });

        // Opportunistic eviction: once the map grows large, periodically drop
        // expired windows so a burst of distinct keys cannot leak memory.
        if (windows.size() > 10_000 && (sweepCounter++ & 0x3F) == 0) {
            windows.entrySet().removeIf(e -> now - e.getValue().startedAt >= windowMs);
        }

        return window.count <= limit;
    }

    /** Testing hook: drop all tracked windows. */
    public void clear() {
        windows.clear();
    }

    private static final class Window {
        final long startedAt;
        int count;

        Window(long startedAt, int count) {
            this.startedAt = startedAt;
            this.count = count;
        }
    }
}
