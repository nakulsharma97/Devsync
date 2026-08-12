package com.devsync.ratelimit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimiterTest {

    private InMemoryFixedWindowRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new InMemoryFixedWindowRateLimiter();
        limiter.clear();
    }

    @Test
    void allows_upToLimit_requestsPerWindow() {
        for (int i = 0; i < 5; i++) {
            assertThat(limiter.tryAcquire("k", 5, 60)).isTrue();
        }
    }

    @Test
    void rejects_requestsBeyondLimit() {
        for (int i = 0; i < 5; i++) {
            limiter.tryAcquire("k", 5, 60);
        }
        assertThat(limiter.tryAcquire("k", 5, 60)).isFalse();
    }

    @Test
    void keys_areIndependent() {
        for (int i = 0; i < 5; i++) {
            limiter.tryAcquire("user:1", 5, 60);
        }
        // A different key has its own fresh quota
        assertThat(limiter.tryAcquire("user:2", 5, 60)).isTrue();
        // The exhausted key is still rejected
        assertThat(limiter.tryAcquire("user:1", 5, 60)).isFalse();
    }

    @Test
    void window_resetsAfterExpiry() throws InterruptedException {
        assertThat(limiter.tryAcquire("k", 1, 1)).isTrue();
        assertThat(limiter.tryAcquire("k", 1, 1)).isFalse();
        Thread.sleep(1100);
        assertThat(limiter.tryAcquire("k", 1, 1)).isTrue();
    }

    @Test
    void clear_resetsAllWindows() {
        limiter.tryAcquire("k", 1, 60);
        limiter.clear();
        assertThat(limiter.tryAcquire("k", 1, 60)).isTrue();
    }
}
