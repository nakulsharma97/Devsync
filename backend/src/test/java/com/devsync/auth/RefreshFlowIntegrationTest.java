package com.devsync.auth;

import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end refresh flow: cookie-based refresh, rotation, reuse detection,
 * logout revocation and blocked-account invalidation — against the real
 * AuthService/RefreshTokenService stack (H2, no mocks).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RefreshFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String userId;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        User user = User.builder()
                .email("flow@test.dev")
                .password(passwordEncoder.encode("password123"))
                .fullName("Flow User")
                .username("flowuser")
                .role(User.Role.USER)
                .emailVerified(true)
                .authProvider("email")
                .build();
        userId = userRepository.save(user).getId();
    }

    private Cookie refreshCookieOf(MvcResult loginResult) {
        return loginResult.getResponse().getCookie(RefreshTokenCookie.NAME);
    }

    private MvcResult login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"flow@test.dev\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                // Access token travels as an HttpOnly cookie — not in the JSON body.
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists(RefreshTokenCookie.NAME))
                .andExpect(cookie().httpOnly(RefreshTokenCookie.NAME, true))
                .andExpect(cookie().exists(AccessTokenCookie.NAME))
                .andExpect(cookie().httpOnly(AccessTokenCookie.NAME, true))
                .andReturn();
    }

    @Test
    void login_setsHttpOnlyCookie_andBodyHasNoRefreshToken() throws Exception {
        MvcResult result = login();
        Cookie cookie = refreshCookieOf(result);
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/auth");
        assertThat(cookie.getValue()).isNotBlank();
    }

    @Test
    void refresh_withCookie_rotatesAndNewAccessTokenWorks() throws Exception {
        Cookie cookie = refreshCookieOf(login());
        String oldValue = cookie.getValue();

        MvcResult refreshed = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                // Access token is set as an HttpOnly cookie, not in the JSON body.
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists(RefreshTokenCookie.NAME))
                .andExpect(cookie().exists(AccessTokenCookie.NAME))
                .andReturn();

        // The new refresh token differs from the old one (rotation).
        assertThat(refreshed.getResponse().getCookie(RefreshTokenCookie.NAME).getValue())
                .isNotEqualTo(oldValue);

        // The new access token cookie is a valid, working access token.
        Cookie accessCookie = refreshed.getResponse().getCookie(AccessTokenCookie.NAME);
        assertThat(accessCookie).isNotNull();
        String newAccess = accessCookie.getValue();
        assertThat(jwtTokenProvider.isAccessToken(newAccess)).isTrue();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/users/me")
                        .header("Authorization", "Bearer " + newAccess))
                .andExpect(status().isOk());
    }

    @Test
    void reusingOldRefreshToken_afterRotation_isRejectedAndRevokesFamily() throws Exception {
        Cookie cookie = refreshCookieOf(login());
        String oldValue = cookie.getValue();

        // Legit rotation.
        mockMvc.perform(post("/api/auth/refresh").cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());

        // Attacker replays the OLD token.
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(RefreshTokenCookie.NAME, oldValue))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_revokesRefreshToken() throws Exception {
        Cookie cookie = refreshCookieOf(login());

        mockMvc.perform(post("/api/auth/logout")
                        .cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge(RefreshTokenCookie.NAME, 0));

        // The revoked token must not refresh anymore.
        mockMvc.perform(post("/api/auth/refresh").cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void blockedUser_cannotRefresh() throws Exception {
        Cookie cookie = refreshCookieOf(login());

        User user = userRepository.findById(userId).orElseThrow();
        user.setBlocked(true);
        userRepository.save(user);

        // Blocked/deleted accounts are rejected with 403 (a deliberate, distinct
        // status from "invalid token" 401) and their sessions are revoked.
        mockMvc.perform(post("/api/auth/refresh").cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void deletedUser_cannotRefresh() throws Exception {
        Cookie cookie = refreshCookieOf(login());

        User user = userRepository.findById(userId).orElseThrow();
        user.setDeleted(true);
        userRepository.save(user);

        mockMvc.perform(post("/api/auth/refresh").cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void refresh_withGarbageToken_isRejected() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(RefreshTokenCookie.NAME, "not-a-real-token"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
