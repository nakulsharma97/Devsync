package com.devsync.ratelimit;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class SpamProtectionFilterTest {

    private InMemoryFixedWindowRateLimiter limiter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        limiter = new InMemoryFixedWindowRateLimiter();
        limiter.clear();
        chain = mock(FilterChain.class);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequest post(String path) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", path);
        req.setRemoteAddr("192.0.2.10");
        return req;
    }

    private void authenticateAs(String userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    @Test
    void rejects_WhenAuthenticatedUser_ExceedsLimit() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, true, 3, false);
        authenticateAs("user-42");

        for (int i = 0; i < 3; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(post("/api/projects/p1/invite"), resp, chain);
            assertThat(resp.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(post("/api/projects/p1/invite"), resp, chain);
        assertThat(resp.getStatus()).isEqualTo(429);
    }

    @Test
    void quota_isPerUser_notShared() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, true, 3, false);
        authenticateAs("user-42");
        for (int i = 0; i < 3; i++) {
            filter.doFilter(post("/api/projects/p1/invite"), new MockHttpServletResponse(), chain);
        }

        authenticateAs("user-7");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(post("/api/projects/p1/invite"), resp, chain);
        assertThat(resp.getStatus()).isEqualTo(200);
    }

    @Test
    void unauthenticated_requests_areKeyedByIp() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, true, 3, false);

        for (int i = 0; i < 3; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(post("/api/projects/p1/join"), resp, chain);
            assertThat(resp.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(post("/api/projects/p1/join"), resp, chain);
        assertThat(resp.getStatus()).isEqualTo(429);
    }

    @Test
    void onlyTargets_inviteJoinAndJoinRequestPaths() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, true, 1, false);
        authenticateAs("user-42");

        // Non-targeted POSTs pass through even after the quota is exhausted
        MockHttpServletResponse first = new MockHttpServletResponse();
        filter.doFilter(post("/api/projects/p1/invite"), first, chain);
        assertThat(first.getStatus()).isEqualTo(200);

        MockHttpServletRequest memberReq = post("/api/projects/p1/members");
        MockHttpServletResponse memberResp = new MockHttpServletResponse();
        filter.doFilter(memberReq, memberResp, chain);
        assertThat(memberResp.getStatus()).isEqualTo(200);
        verify(chain).doFilter(memberReq, memberResp);
    }

    @Test
    void disabled_filter_passesEverythingThrough() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, false, 1, false);
        authenticateAs("user-42");

        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(post("/api/projects/p1/invite"), resp, chain);
            assertThat(resp.getStatus()).isEqualTo(200);
        }
    }

    @Test
    void follows_areLimited_to30PerMinutePerUser() throws Exception {
        // The legacy 4-arg constructor keeps the follow default of 30/min.
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, true, 10, false);
        authenticateAs("user-42");

        for (int i = 0; i < 30; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(post("/api/connections/follow"), resp, chain);
            assertThat(resp.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(post("/api/connections/follow"), resp, chain);
        assertThat(resp.getStatus()).isEqualTo(429);
        assertThat(resp.getHeader("Retry-After")).isEqualTo("60");
    }

    @Test
    void follow_and_invite_buckets_are_independent() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, true, 1, false);
        authenticateAs("user-42");

        // Invite quota exhausted (1/min) — follow still allowed.
        MockHttpServletResponse invite = new MockHttpServletResponse();
        filter.doFilter(post("/api/projects/p1/invite"), invite, chain);
        assertThat(invite.getStatus()).isEqualTo(200);

        for (int i = 0; i < 30; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(post("/api/connections/follow"), resp, chain);
            assertThat(resp.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(post("/api/connections/follow"), resp, chain);
        assertThat(resp.getStatus()).isEqualTo(429);
    }

    @Test
    void reports_areLimited_to5PerMinutePerUser() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(
                limiter, true, false,
                java.util.Map.of("projects", 10, "connections", 30, "reports", 5));
        authenticateAs("user-42");

        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(post("/api/reports"), resp, chain);
            assertThat(resp.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(post("/api/reports"), resp, chain);
        assertThat(resp.getStatus()).isEqualTo(429);
    }

    @Test
    void unfollow_isLimited_alongsideFollow() throws Exception {
        SpamProtectionFilter filter = new SpamProtectionFilter(limiter, true, 1, false);
        authenticateAs("user-42");

        for (int i = 0; i < 30; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(post("/api/connections/unfollow"), resp, chain);
            assertThat(resp.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(post("/api/connections/unfollow"), resp, chain);
        assertThat(resp.getStatus()).isEqualTo(429);
    }
}
