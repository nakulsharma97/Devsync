package com.devsync.config;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.auth.RefreshTokenCookie;
import com.devsync.auth.AccessTokenCookie;
import com.devsync.auth.RefreshTokenService;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.util.Map;

@Configuration
@RequiredArgsConstructor
public class OAuth2Config {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenCookie refreshTokenCookie;
    private final AccessTokenCookie accessTokenCookie;
    private final PasswordEncoder passwordEncoder;

    /**
     * Custom OAuth2 user service that creates/updates users from OAuth provider data.
     */
    @Bean
    public OAuth2UserService<OAuth2UserRequest, OAuth2User> oAuth2UserService() {
        DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
        return (userRequest) -> {
            OAuth2User oAuth2User = delegate.loadUser(userRequest);
            String registrationId = userRequest.getClientRegistration().getRegistrationId();
            Map<String, Object> attributes = oAuth2User.getAttributes();

            String email = extractEmail(registrationId, attributes);
            String name = extractName(registrationId, attributes);
            String avatarUrl = extractAvatar(registrationId, attributes);

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                String username = email.split("@")[0];
                String base = username;
                int suffix = 1;
                while (userRepository.countByUsername(username) > 0) {
                    username = base + suffix++;
                }
                user = User.builder()
                        .email(email)
                        .password(passwordEncoder.encode("oauth-" + System.currentTimeMillis()))
                        .fullName(name)
                        .username(username)
                        .avatarUrl(avatarUrl)
                        .authProvider(registrationId)
                        .emailVerified(true)
                        .build();
                user = userRepository.save(user);
            }
            return oAuth2User;
        };
    }

    /**
     * After OAuth success, set the refresh token as an HttpOnly cookie and redirect
     * to the frontend with ONLY the short-lived access token in the URL fragment
     * (never the refresh token — fragments don't reach server logs or Referer).
     */
    @Bean
    public AuthenticationSuccessHandler oAuth2SuccessHandler() {
        return (HttpServletRequest request, HttpServletResponse response,
                org.springframework.security.core.Authentication authentication) -> {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            String email = extractEmail("default", oAuth2User.getAttributes());

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found after OAuth"));

            String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
            String refreshToken = refreshTokenService.issue(user.getId(),
                    request.getRemoteAddr(), request.getHeader("User-Agent"));
            response.addCookie(refreshTokenCookie.create(refreshToken));
            response.addCookie(accessTokenCookie.create(accessToken));

            String frontendUrl = System.getenv("FRONTEND_URL") != null
                    ? System.getenv("FRONTEND_URL")
                    : "http://localhost:5173";

            // Redirect without exposing the token in the URL — both tokens are now
            // in HttpOnly cookies, so the frontend just needs to fetch the user profile.
            response.sendRedirect(frontendUrl + "/auth?oauth=success");
        };
    }

    private String extractEmail(String provider, Map<String, Object> attrs) {
        if ("github".equals(provider)) return (String) attrs.get("email");
        if ("google".equals(provider)) return (String) attrs.get("email");
        return (String) attrs.get("email");
    }

    @SuppressWarnings("unchecked")
    private String extractName(String provider, Map<String, Object> attrs) {
        if ("github".equals(provider)) return (String) attrs.get("login");
        if ("google".equals(provider)) return (String) attrs.get("name");
        if (attrs.containsKey("login")) return (String) attrs.get("login");
        return (String) attrs.get("name");
    }

    private String extractAvatar(String provider, Map<String, Object> attrs) {
        if ("github".equals(provider)) return (String) attrs.get("avatar_url");
        if ("google".equals(provider)) return (String) attrs.get("picture");
        if (attrs.containsKey("avatar_url")) return (String) attrs.get("avatar_url");
        if (attrs.containsKey("picture")) return (String) attrs.get("picture");
        return null;
    }
}
