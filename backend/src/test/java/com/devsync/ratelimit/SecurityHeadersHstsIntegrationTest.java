package com.devsync.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * When app.security.hsts is enabled (the production profile) and the request
 * arrives over HTTPS (X-Forwarded-Proto: https from the reverse proxy), every
 * response advertises Strict-Transport-Security — the HTTPS-only upgrade
 * guarantee. Same request over plain HTTP must NOT receive HSTS.
 */
@SpringBootTest(properties = {
        "app.security.hsts=true",
        "server.forward-headers-strategy=framework"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHeadersHstsIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void hsts_isAdvertised_whenEnabled_andSecure() throws Exception {
        mockMvc.perform(get("/api/health").header("X-Forwarded-Proto", "https"))
                .andExpect(status().isOk())
                .andExpect(header().string("Strict-Transport-Security", "max-age=31536000 ; includeSubDomains"));
    }

    @Test
    void hsts_isNotAdvertised_overPlainHttp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }
}
