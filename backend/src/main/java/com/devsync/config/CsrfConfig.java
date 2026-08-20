package com.devsync.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * CSRF configuration for cookie-based authentication.
 *
 * <p>
 * Since both access and refresh tokens are now in HttpOnly cookies, the
 * application must protect against cross-site request forgery. We use
 * Spring's {@link CookieCsrfTokenRepository} which stores the CSRF token in
 * a cookie ({@code XSRF-TOKEN}) and expects it back in the
 * {@code X-XSRF-TOKEN} header on state-changing requests.
 *
 * <p>
 * We use {@link CsrfTokenRequestAttributeHandler} (not the XOR variant)
 * because the SPA reads the raw token from the cookie and sends it as a
 * header. The XOR handler would try to XOR-decode the already-raw token,
 * producing garbage and causing 403 errors.
 *
 * <p>
 * The {@link CsrfCookieFilter} eagerly loads the CSRF token on every
 * request so the {@code XSRF-TOKEN} cookie is always set on responses —
 * Spring Security 6.x defers token loading by default.
 */
@Configuration
public class CsrfConfig {

    @Value("${app.jwt.refresh-expiration-ms:2592000000}")
    private long refreshExpirationMs;

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        // Match the refresh-token lifetime so the CSRF cookie doesn't silently
        // expire (as a session cookie) while the user is still authenticated.
        repository.setCookieMaxAge((int) (refreshExpirationMs / 1000));
        return repository;
    }

    @Bean
    public CsrfTokenRequestAttributeHandler csrfTokenRequestHandler() {
        // Plain CsrfTokenRequestAttributeHandler: the SPA reads the raw
        // XSRF-TOKEN cookie value and sends it as the X-XSRF-TOKEN header.
        // The handler compares the raw token directly — no XOR transform.
        return new CsrfTokenRequestAttributeHandler();
    }

    /**
     * Eagerly loads the CSRF token on every request so the {@code XSRF-TOKEN}
     * cookie is always set on the response. Without this filter, Spring
     * Security 6.x defers token loading and the cookie is never sent to
     * the browser.
     */
    @Bean
    public OncePerRequestFilter csrfCookieFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain filterChain)
                    throws ServletException, IOException {
                CsrfToken csrfToken = (CsrfToken) request.getAttribute(
                        CsrfToken.class.getName());
                if (csrfToken != null) {
                    // Trigger token resolution — this causes the
                    // CsrfFilter to save the token to the cookie.
                    csrfToken.getToken();
                }
                filterChain.doFilter(request, response);
            }
        };
    }
}
