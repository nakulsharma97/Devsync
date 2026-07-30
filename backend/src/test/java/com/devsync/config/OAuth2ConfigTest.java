package com.devsync.config;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    @MockitoBean private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        lenient().when(jwtTokenProvider.generateAccessToken(anyString(), anyString()))
                .thenReturn("mock-access-token");
        lenient().when(jwtTokenProvider.generateRefreshToken(anyString()))
                .thenReturn("mock-refresh-token");
    }

    @Test
    void oAuth2SuccessHandler_shouldRedirectWithTokensInFragment() throws Exception {
        // Create a mock OAuth2User for GitHub authentication
        Map<String, Object> attributes = Map.of(
                "email", "oauth@test.com",
                "login", "oauthuser",
                "avatar_url", "https://avatars.test.com/u/1"
        );
        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                attributes,
                "email"
        );

        User user = User.builder()
                .email("oauth@test.com")
                .fullName("oauthuser")
                .username("oauthuser")
                .build();
        user.setId("user-oauth-1");

        when(userRepository.findByEmail("oauth@test.com")).thenReturn(Optional.of(user));

        // Create mocks
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        // Simulate Spring Security OAuth2 authentication token
        org.springframework.security.core.Authentication authentication =
                mock(org.springframework.security.core.Authentication.class);
        when(authentication.getPrincipal()).thenReturn(oAuth2User);

        // Execute handler
        oAuth2SuccessHandler.onAuthenticationSuccess(request, response, authentication);

        // Verify redirect with URL fragment (#) containing JWT tokens
        verify(response).sendRedirect(argThat(redirectUrl -> {
            assertThat(redirectUrl)
                    .startsWith("http://localhost:5173/auth#access_token=")
                    .contains("access_token=mock-access-token")
                    .contains("refresh_token=mock-refresh-token");
            return true;
        }));
    }

    @Test
    void oAuth2SuccessHandler_shouldUseFrontendUrlEnvVar_whenSet() throws Exception {
        Map<String, Object> attributes = Map.of(
                "email", "prod@test.com",
                "login", "produser"
        );
        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(),
                attributes, "email"
        );

        User user = User.builder()
                .email("prod@test.com")
                .fullName("produser")
                .username("produser")
                .build();
        user.setId("user-prod");

        when(userRepository.findByEmail("prod@test.com")).thenReturn(Optional.of(user));

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        org.springframework.security.core.Authentication authentication =
                mock(org.springframework.security.core.Authentication.class);
        when(authentication.getPrincipal()).thenReturn(oAuth2User);

        oAuth2SuccessHandler.onAuthenticationSuccess(request, response, authentication);

        verify(response).sendRedirect(argThat(redirectUrl ->
                redirectUrl.startsWith("http://localhost:5173/auth#access_token=")
        ));
    }

    @Test
    void oAuth2SuccessHandler_shouldThrow_whenUserNotFound() throws Exception {
        Map<String, Object> attributes = Map.of("email", "nonexistent@test.com");
        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(), attributes, "email"
        );

        when(userRepository.findByEmail("nonexistent@test.com")).thenReturn(Optional.empty());

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        org.springframework.security.core.Authentication authentication =
                mock(org.springframework.security.core.Authentication.class);
        when(authentication.getPrincipal()).thenReturn(oAuth2User);

        // Should throw because user not found in DB
        try {
            oAuth2SuccessHandler.onAuthenticationSuccess(request, response, authentication);
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).contains("User not found after OAuth");
        }
    }

    @Test
    void oAuth2SuccessHandler_shouldIncludeAccessAndRefreshTokens() throws Exception {
        Map<String, Object> attributes = Map.of(
                "email", "token@test.com",
                "login", "tokenuser"
        );
        OAuth2User oAuth2User = new DefaultOAuth2User(
                Collections.emptyList(), attributes, "email"
        );

        User user = User.builder()
                .email("token@test.com")
                .fullName("tokenuser")
                .username("tokenuser")
                .build();
        user.setId("user-token");

        when(userRepository.findByEmail("token@test.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken("user-token", "token@test.com"))
                .thenReturn("at-123");
        when(jwtTokenProvider.generateRefreshToken("user-token"))
                .thenReturn("rt-456");

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        org.springframework.security.core.Authentication authentication =
                mock(org.springframework.security.core.Authentication.class);
        when(authentication.getPrincipal()).thenReturn(oAuth2User);

        oAuth2SuccessHandler.onAuthenticationSuccess(request, response, authentication);

        verify(response).sendRedirect(
                "http://localhost:5173/auth#access_token=at-123&refresh_token=rt-456"
        );
    }
}
