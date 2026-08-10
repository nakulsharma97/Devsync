package com.devsync.auth;

import jakarta.servlet.http.Cookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Builds the refresh-token cookie. The cookie is HttpOnly (invisible to
 * JavaScript — no XSS exfiltration), SameSite=Lax (sent on same-site requests
 * only, which neutralizes cross-site request forgery on the stateless API),
 * and scoped to /api/auth so it is only sent to the auth endpoints that need it.
 * `Secure` is enabled in production via DEVSYNC_COOKIE_SECURE=true.
 */
@Component
public class RefreshTokenCookie {

    public static final String NAME = "refresh_token";

    @Value("${app.jwt.refresh-expiration-ms:2592000000}")
    private long refreshExpirationMs;

    @Value("${app.auth.cookie-secure:false}")
    private boolean secure;

    public Cookie create(String refreshToken) {
        Cookie cookie = new Cookie(NAME, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath("/api/auth");
        cookie.setMaxAge((int) (refreshExpirationMs / 1000));
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }

    public Cookie clear() {
        Cookie cookie = new Cookie(NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }
}
