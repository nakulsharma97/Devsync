package com.devsync.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web hardening: every API response carries the standard security headers,
 * HSTS is absent in non-HTTPS configurations, and CORS allows only the
 * configured frontend origin (never a wildcard).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHeadersIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void apiResponses_carrySecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }

    @Test
    void hsts_isNotAdvertised_whenDisabled() throws Exception {
        // The test profile does not enable app.security.hsts — HSTS must only
        // appear where HTTPS is guaranteed (prod).
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }

    @Test
    void cors_allowsOnlyConfiguredOrigin() throws Exception {
        // Configured frontend origin (default dev origins in CorsConfig)
        mockMvc.perform(options("/api/users")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));

        // Unknown origin → preflight rejected, no CORS headers granted
        mockMvc.perform(options("/api/users")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void cors_neverUsesWildcardOrigin_withCredentials() throws Exception {
        // GET /api/users reflects the allowed origin (401 — no token — but the
        // CORS filter still runs first); a wildcard "*" would be a hard failure
        // alongside allowCredentials(true).
        mockMvc.perform(get("/api/users")
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
