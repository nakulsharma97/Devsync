package com.devsync.auth;

import com.devsync.auth.dto.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@WebMvcTest(AuthController.class)
@Import(AuthControllerTest.TestSecurityConfig.class)
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private AuthService authService;

    // Test-specific security config: disables CSRF and permits /api/auth/**
    // to match the production SecurityConfig rules.
    @org.springframework.context.annotation.Configuration
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .anyRequest().authenticated()
                );
            return http.build();
        }
    }

    private AuthResponse sampleResponse() {
        return AuthResponse.builder()
                .accessToken("at").refreshToken("rt").tokenType("Bearer")
                .user(AuthResponse.UserDto.builder()
                        .id("uid").email("test@test.com").fullName("Test User").role("USER").build())
                .build();
    }

    // ── Register ───────────────────────────────────────────────

    @Test
    void register_shouldReturn200() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@test.com");
        request.setPassword("Secure1@pass");
        request.setFullName("Test User");

        when(authService.register(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"))
                .andExpect(jsonPath("$.user.email").value("test@test.com"));
    }

    @Test
    void register_shouldReturn400ForShortPassword() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@test.com");
        request.setPassword("123");
        request.setFullName("Test User");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_shouldReturn400ForBlankEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("");
        request.setPassword("Secure1@pass");
        request.setFullName("Test User");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── Login ──────────────────────────────────────────────────

    @Test
    void login_shouldReturn200() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        when(authService.login(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    void login_shouldReturn400ForMissingPassword() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── Refresh ─────────────────────────────────────────────────

    @Test
    void refresh_shouldReturn200() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("some-refresh-token");

        when(authService.refreshToken(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    void refresh_shouldReturn400ForMissingToken() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("");

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── OTP ─────────────────────────────────────────────────────

    @Test
    void otpSend_shouldReturn200() throws Exception {
        mockMvc.perform(post("/api/auth/otp/send")
                        .param("email", "test@test.com"))
                .andExpect(status().isOk());
    }

    @Test
    void otpVerify_shouldReturn200() throws Exception {
        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("123456");

        when(authService.verifyOtpAndLogin(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"));
    }

    // ── OAuth Callback ──────────────────────────────────────────

    @Test
    void oauthCallback_shouldReturn200() throws Exception {
        OAuthCallbackRequest request = new OAuthCallbackRequest();
        request.setEmail("oauth@test.com");
        request.setFullName("OAuth User");
        request.setAvatarUrl("https://avatar.test.com/img.png");
        request.setProvider("github");

        when(authService.handleOAuthCallback("oauth@test.com", "OAuth User",
                "https://avatar.test.com/img.png", "github"))
                .thenReturn(sampleResponse());

        mockMvc.perform(post("/api/auth/oauth/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    void oauthCallback_shouldReturn400ForMissingEmail() throws Exception {
        OAuthCallbackRequest request = new OAuthCallbackRequest();
        request.setEmail("");
        request.setFullName("OAuth User");
        request.setProvider("google");

        mockMvc.perform(post("/api/auth/oauth/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void oauthCallback_shouldReturn400ForMissingProvider() throws Exception {
        OAuthCallbackRequest request = new OAuthCallbackRequest();
        request.setEmail("oauth@test.com");
        request.setFullName("OAuth User");
        request.setProvider("");

        mockMvc.perform(post("/api/auth/oauth/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── Get Current User (authenticated) ────────────────────────

    @Test
    @WithMockUser(username = "user-123")
    void getCurrentUser_shouldReturnUser() throws Exception {
        com.devsync.user.dto.UserResponse userResponse =
                com.devsync.user.dto.UserResponse.builder()
                        .id("user-123").email("me@test.com").fullName("Me")
                        .username("meuser").role("USER")
                        .build();

        when(authService.getCurrentUser("user-123")).thenReturn(userResponse);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("user-123"))
                .andExpect(jsonPath("$.email").value("me@test.com"))
                .andExpect(jsonPath("$.fullName").value("Me"))
                .andExpect(jsonPath("$.username").value("meuser"));
    }

    @Test
    void getCurrentUser_shouldReturn401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
