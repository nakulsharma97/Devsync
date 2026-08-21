package com.devsync.config;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.auth.RefreshTokenCookie;
import com.devsync.auth.RefreshTokenService;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes = {OAuth2Config.class})
@ActiveProfiles("test")
class OAuth2ConfigTest {

    @Autowired private AuthenticationSuccessHandler oAuth2SuccessHandler;

    @MockitoBean private UserRepository userRepository;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private RefreshTokenService refreshTokenService;
    @MockitoBean private RefreshTokenCookie refreshTokenCookie;
    @MockitoBean private com.devsync.auth.AccessTokenCookie accessTokenCookie;
    @MockitoBean private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        lenient().when(jwtTokenProvider.generateAccessToken(anyString(), anyString()))
                .thenReturn("mock-access-token");
        lenient().when(refreshTokenService.issue(anyString(), any(), any()))
                .thenReturn("mock-refresh-token");
        lenient().when(refreshTokenCookie.create(anyString()))
                .thenAnswer(inv -> new Cookie(RefreshTokenCookie.NAME, inv.getArgument(0)));
        lenient().when(accessTokenCookie.create(anyString()))
                .thenAnswer(inv -> new Cookie(com.devsync.auth.AccessTokenCookie.NAME, inv.getArgument(0)));
    }

    private OAuth2User oauthUser(String email, String login) {
        return new DefaultOAuth2User(Collections.emptyList(),
                Map.of("email", email, "login", login, "avatar_url", "https://avatars.test.com/u/1"),
                "email");
    }

    private User user(String id, String email) {
        User u = User.builder().email(email).fullName("u").username("u").build();
        u.setId(id);
        return u;
    }

    private HttpServletRequest request() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("1.2.3.4");
        return request;
    }

    private org.springframework.security.core.Authentication authentication(OAuth2User oAuth2User) {
        org.springframework.security.core.Authentication authentication =
                mock(org.springframework.security.core.Authentication.class);
        when(authentication.getPrincipal()).thenReturn(oAuth2User);
        return authentication;
    }

    @Test
    void oAuth2SuccessHandler_shouldRedirectWithAccessTokenInFragment_AndRefreshInCookie() throws Exception {
        User user = user("user-oauth-1", "oauth@test.com");
        when(userRepository.findByEmail("oauth@test.com")).thenReturn(Optional.of(user));

        HttpServletResponse response = mock(HttpServletResponse.class);
        oAuth2SuccessHandler.onAuthenticationSuccess(request(), response, authentication(oauthUser("oauth@test.com", "oauthuser")));

        // Both tokens travel as HttpOnly cookies — the redirect URL has no tokens.
        verify(response).sendRedirect(argThat(redirectUrl -> {
            assertThat(redirectUrl)
                    .startsWith("http://localhost:5173/auth?oauth=success")
                    .doesNotContain("access_token")
                    .doesNotContain("refresh_token");
            return true;
        }));
        verify(response).addCookie(argThat(c ->
                RefreshTokenCookie.NAME.equals(c.getName()) && "mock-refresh-token".equals(c.getValue())));
        verify(response).addCookie(argThat(c ->
                com.devsync.auth.AccessTokenCookie.NAME.equals(c.getName()) && "mock-access-token".equals(c.getValue())));
    }

    @Test
    void oAuth2SuccessHandler_shouldUseFrontendUrlEnvVar_whenSet() throws Exception {
        User user = user("user-prod", "prod@test.com");
        when(userRepository.findByEmail("prod@test.com")).thenReturn(Optional.of(user));

        HttpServletResponse response = mock(HttpServletResponse.class);
        oAuth2SuccessHandler.onAuthenticationSuccess(request(), response, authentication(oauthUser("prod@test.com", "produser")));

        // Redirect uses ?oauth=success — no tokens in the URL.
        verify(response).sendRedirect(argThat(redirectUrl ->
                redirectUrl.startsWith("http://localhost:5173/auth?oauth=success")
                        && !redirectUrl.contains("access_token")
                        && !redirectUrl.contains("refresh_token")
        ));
    }

    @Test
    void oAuth2SuccessHandler_shouldThrow_whenUserNotFound() throws Exception {
        when(userRepository.findByEmail("nonexistent@test.com")).thenReturn(Optional.empty());

        HttpServletResponse response = mock(HttpServletResponse.class);
        try {
            oAuth2SuccessHandler.onAuthenticationSuccess(request(), response,
                    authentication(oauthUser("nonexistent@test.com", "nobody")));
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).contains("User not found after OAuth");
        }
        // No refresh token issued for an unknown user.
        verify(refreshTokenService, never()).issue(anyString(), any(), any());
    }

    @Test
    void oAuth2SuccessHandler_shouldIssueRegistryRefreshToken_AndRedirectExactUrl() throws Exception {
        User user = user("user-token", "token@test.com");
        when(userRepository.findByEmail("token@test.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken("user-token", "token@test.com"))
                .thenReturn("at-123");
        when(refreshTokenService.issue("user-token", "1.2.3.4", null))
                .thenReturn("rt-456");

        HttpServletResponse response = mock(HttpServletResponse.class);
        oAuth2SuccessHandler.onAuthenticationSuccess(request(), response,
                authentication(oauthUser("token@test.com", "tokenuser")));

        verify(response).sendRedirect("http://localhost:5173/auth?oauth=success");
        verify(response).addCookie(argThat(c ->
                RefreshTokenCookie.NAME.equals(c.getName()) && "rt-456".equals(c.getValue())));
        verify(response).addCookie(argThat(c ->
                com.devsync.auth.AccessTokenCookie.NAME.equals(c.getName()) && "at-123".equals(c.getValue())));
    }
}
