package com.devsync.auth;

import jakarta.servlet.http.Cookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Builds the access-token cookie. Like {@link RefreshTokenCookie}, the access
 * token is now stored in an HttpOnly cookie so it is never exposed to
 * JavaScript (XSS-safe).
 *
 * <p>The cookie is scoped to {@code /api} so it is sent with every API request.
 * The {@link JwtAuthenticationFilter} reads the access token from this cookie
 * when no {@code Authorization: Bearer} header is present.
 */
@Component
public class AccessTokenCookie {

    public static final String NAME = "access_token";

    @Value("${app.jwt.expiration-ms:900000}")
    private long accessExpirationMs;

    @Value("${app.auth.cookie-secure:false}")
    private boolean secure;

    public Cookie create(String accessToken) {
        Cookie cookie = new Cookie(NAME, accessToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath("/api");
        cookie.setMaxAge((int) (accessExpirationMs / 1000));
        // SameSite=Lax: sent on same-site navigations and AJAX, but not on
        // cross-site form submissions — neutralizes CSRF for stateless JWT auth.
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }

    public Cookie clear() {
        Cookie cookie = new Cookie(NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath("/api");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }
}
