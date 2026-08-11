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
import jakarta.servlet.http.Cookie;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock private AuthService authService;
    @Mock private AccountRecoveryService accountRecoveryService;
    @Mock private RefreshTokenCookie refreshTokenCookie;
    @InjectMocks private AuthController authController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        Cookie httpOnly = new Cookie(RefreshTokenCookie.NAME, "rt-cookie");
        httpOnly.setHttpOnly(true);
        lenient().when(refreshTokenCookie.create(anyString())).thenReturn(httpOnly);
        Cookie cleared = new Cookie(RefreshTokenCookie.NAME, "");
        cleared.setMaxAge(0);
        lenient().when(refreshTokenCookie.clear()).thenReturn(cleared);
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
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
        when(authService.register(any(), any(), any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"))
                .andExpect(jsonPath("$.user.email").value("test@test.com"))
                // The refresh token must never appear in the JSON body — it lives
                // in the HttpOnly cookie only.
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists(RefreshTokenCookie.NAME))
                .andExpect(cookie().httpOnly(RefreshTokenCookie.NAME, true));
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
        when(authService.login(any(), any(), any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists(RefreshTokenCookie.NAME));
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
    void refresh_shouldReturn200_WithCookie() throws Exception {
        when(authService.refreshToken(any(), any(), any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .cookie(new Cookie(RefreshTokenCookie.NAME, "cookie-refresh-token"))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists(RefreshTokenCookie.NAME));

        // Rotation must have been performed with the cookie value.
        verify(authService).refreshToken(argThat(r -> "cookie-refresh-token".equals(r.getRefreshToken())),
                any(), any());
    }

    @Test
    void refresh_shouldReturn401_WhenNoTokenAtAll() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_shouldRevokeAndClearCookie() throws Exception {
        org.springframework.mock.web.MockHttpServletResponse servletResponse =
                new org.springframework.mock.web.MockHttpServletResponse();
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                "test@test.com", "pw", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")));

        authController.logout(userDetails, new RefreshTokenRequest(), "cookie-refresh-token", servletResponse);

        verify(authService).logout("test@test.com", "cookie-refresh-token");
        jakarta.servlet.http.Cookie cookie = servletResponse.getCookie(RefreshTokenCookie.NAME);
        assertThat(cookie).isNotNull();
        assertThat(cookie.getMaxAge()).isZero();
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
        when(authService.verifyOtpAndLogin(any(), any(), any())).thenReturn(sampleResponse());
        mockMvc.perform(post("/api/auth/otp/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user("test@test.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("at"))
                .andExpect(cookie().exists(RefreshTokenCookie.NAME));
    }

    @Test
    void oauthCallbackEndpoint_shouldNotExist() throws Exception {
        // The client-supplied OAuth callback was removed for security (account
        // takeover via arbitrary email). OAuth login is server-side only.
        mockMvc.perform(post("/api/auth/oauth/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"any@test.com\",\"provider\":\"github\"}"))
                .andExpect(status().isNotFound());
    }
}
