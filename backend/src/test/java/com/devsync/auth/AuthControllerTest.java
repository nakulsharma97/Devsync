package com.devsync.auth;

import com.devsync.auth.dto.*;
import com.devsync.common.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock private AuthService authService;
    @InjectMocks private AuthController authController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(
                        new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
                .build();
    }

    private AuthResponse sampleResponse() {
        return AuthResponse.builder()
                .accessToken("at").refreshToken("rt").tokenType("Bearer")
                .user(AuthResponse.UserDto.builder()
                        .id("uid").email("test@test.com").fullName("Test User").role("USER").build())
                .build();
    }

    @Test
    void register_shouldReturn200() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@test.com");
        request.setPassword("Secure1@pass");
        request.setFullName("Test User");
        when(authService.register(any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
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
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
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
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_shouldReturn200() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");
        when(authService.login(any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
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
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refresh_shouldReturn200() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("some-refresh-token");
        when(authService.refreshToken(any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"));
    }

    @Test
    void refresh_shouldReturn400ForMissingToken() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("");
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void otpSend_shouldReturn200() throws Exception {
        mockMvc.perform(post("/api/auth/otp/send")
                .param("email", "test@test.com")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
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
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"));
    }

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
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("oauth@test.com").roles("USER")))
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
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("oauth@test.com").roles("USER")))
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
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("oauth@test.com").roles("USER")))
                .andExpect(status().isBadRequest());
    }

    @Test
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
}
