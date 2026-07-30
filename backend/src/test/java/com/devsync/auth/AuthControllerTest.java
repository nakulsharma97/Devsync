package com.devsync.auth;

import com.devsync.auth.dto.*;
import com.devsync.common.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private AuthService authService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private RateLimitingFilter rateLimitingFilter;

    private AuthResponse sampleResponse() {
        return AuthResponse.builder()
                .accessToken("at").refreshToken("rt").tokenType("Bearer")
                .user(AuthResponse.UserDto.builder()
                        .id("uid").email("test@test.com").fullName("Test User").role("USER").build())
                .build();
    }

    @Test
    @WithMockUser
    void register_shouldReturn200() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@test.com");
        request.setPassword("Secure1@pass");
        request.setFullName("Test User");
        when(authService.register(any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("at")).andExpect(jsonPath("$.user.email").value("test@test.com"));
    }

    @Test
    @WithMockUser
    void register_shouldReturn400ForShortPassword() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@test.com");
        request.setPassword("123");
        request.setFullName("Test User");
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void register_shouldReturn400ForBlankEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("");
        request.setPassword("Secure1@pass");
        request.setFullName("Test User");
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void login_shouldReturn200() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");
        when(authService.login(any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    @WithMockUser
    void login_shouldReturn400ForMissingPassword() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("");
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void refresh_shouldReturn200() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("some-refresh-token");
        when(authService.refreshToken(any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    @WithMockUser
    void refresh_shouldReturn400ForMissingToken() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("");
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void otpSend_shouldReturn200() throws Exception {
        mockMvc.perform(post("/api/auth/otp/send").param("email", "test@test.com").with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void otpVerify_shouldReturn200() throws Exception {
        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("123456");
        when(authService.verifyOtpAndLogin(any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    @WithMockUser
    void oauthCallback_shouldReturn200() throws Exception {
        OAuthCallbackRequest request = new OAuthCallbackRequest();
        request.setEmail("oauth@test.com");
        request.setFullName("OAuth User");
        request.setAvatarUrl("https://avatar.test.com/img.png");
        request.setProvider("github");
        when(authService.handleOAuthCallback("oauth@test.com", "OAuth User",
                "https://avatar.test.com/img.png", "github"))
                .thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/oauth/callback").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    @WithMockUser
    void oauthCallback_shouldReturn400ForMissingEmail() throws Exception {
        OAuthCallbackRequest request = new OAuthCallbackRequest();
        request.setEmail("");
        request.setFullName("OAuth User");
        request.setProvider("google");
        mockMvc.perform(post("/api/auth/oauth/callback").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void oauthCallback_shouldReturn400ForMissingProvider() throws Exception {
        OAuthCallbackRequest request = new OAuthCallbackRequest();
        request.setEmail("oauth@test.com");
        request.setFullName("OAuth User");
        request.setProvider("");
        mockMvc.perform(post("/api/auth/oauth/callback").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)).with(csrf()))
                .andExpect(status().isBadRequest());
    }

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
