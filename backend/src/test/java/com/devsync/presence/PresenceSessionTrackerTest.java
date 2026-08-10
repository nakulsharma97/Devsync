package com.devsync.presence;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PresenceSessionTrackerTest {

    private PresenceSessionTracker tracker;

    @BeforeEach
    void setUp() {
        tracker = new PresenceSessionTracker();
    }

    @Test
    void connected_shouldRegisterSession() {
        assertThat(tracker.connected("u1", "s1")).isEqualTo(1);
        assertThat(tracker.activeSessions("u1")).isEqualTo(1);
    }

    @Test
    void multipleSessions_shouldBeTrackedIndependently() {
        tracker.connected("u1", "tab-a");
        tracker.connected("u1", "tab-b");
        tracker.connected("u2", "device-x");

        assertThat(tracker.activeSessions("u1")).isEqualTo(2);
        assertThat(tracker.activeSessions("u2")).isEqualTo(1);
    }

    @Test
    void disconnectOneOfTwo_shouldKeepUserOnline() {
        tracker.connected("u1", "tab-a");
        tracker.connected("u1", "tab-b");

        int remaining = tracker.disconnected("u1", "tab-a");

        assertThat(remaining).isEqualTo(1);
        assertThat(tracker.activeSessions("u1")).isEqualTo(1);
    }

    @Test
    void disconnectLastSession_shouldReturnZero() {
        tracker.connected("u1", "tab-a");
        tracker.connected("u1", "tab-b");

        tracker.disconnected("u1", "tab-a");
        int remaining = tracker.disconnected("u1", "tab-b");

        assertThat(remaining).isZero();
        assertThat(tracker.activeSessions("u1")).isZero();
    }

    @Test
    void reconnect_afterFullDisconnect_shouldStartFresh() {
        tracker.connected("u1", "s1");
        tracker.disconnected("u1", "s1");
        assertThat(tracker.activeSessions("u1")).isZero();

        tracker.connected("u1", "s2");
        assertThat(tracker.activeSessions("u1")).isEqualTo(1);

        // A stale disconnect for the old session must not knock the user offline.
        tracker.disconnected("u1", "s1");
        assertThat(tracker.activeSessions("u1")).isEqualTo(1);
    }

    @Test
    void unknownDisconnect_shouldBeHarmless() {
        assertThat(tracker.disconnected("ghost", "nope")).isZero();
        assertThat(tracker.activeSessions("ghost")).isZero();
    }
}
