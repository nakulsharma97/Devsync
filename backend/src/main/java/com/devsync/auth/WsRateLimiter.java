package com.devsync.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Per-user rate limiter for the WebSocket/STOMP path (the servlet
 * {@link RateLimitingFilter} does not cover WebSocket traffic).
 *
 * <p>Suitable for a single application instance: state is in-memory with a
 * bounded map (one entry per active user) and lazy + disconnect-time cleanup,
 * so it cannot grow without bound. Move to Redis when the app is deployed
 * multi-instance.
 */
@Component
public class WsRateLimiter {

    private static final long WINDOW_MS = 60_000;

    @Value("${app.rate-limit.ws.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limit.ws.max-messages-per-minute:120}")
    private int maxMessagesPerMinute;

    @Value("${app.rate-limit.ws.max-subscriptions-per-minute:30}")
    private int maxSubscriptionsPerMinute;

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    /** @return true when the message is allowed, false when the limit is exceeded. */
    public boolean allowMessage(String userId) {
        return allow(userId, maxMessagesPerMinute, false);
    }

    /** @return true when the subscribe is allowed, false when the limit is exceeded. */
    public boolean allowSubscription(String userId) {
        return allow(userId, maxSubscriptionsPerMinute, true);
    }

    /** Removes all state for a user (called on STOMP DISCONNECT). */
    public void clear(String userId) {
        entries.remove(userId);
    }

    private boolean allow(String userId, int limit, boolean subscriptionBucket) {
        if (!enabled || userId == null) {
            return true;
        }
        long now = System.currentTimeMillis();
        Entry entry = entries.compute(userId, (key, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new Entry(now);
            }
            return existing;
        });
        AtomicInteger counter = subscriptionBucket ? entry.subscriptions : entry.messages;
        synchronized (counter) {
            if (counter.get() >= limit) {
                return false;
            }
            counter.incrementAndGet();
            return true;
        }
    }

    /** Visible for tests. */
    public int activeUsers() {
        return entries.size();
    }

    private static final class Entry {
        final long windowStart;
        final AtomicInteger messages = new AtomicInteger();
        final AtomicInteger subscriptions = new AtomicInteger();

        Entry(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
