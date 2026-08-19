package com.devsync.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;

/**
 * CSRF configuration for cookie-based authentication.
 *
 * <p>Since both access and refresh tokens are now in HttpOnly cookies, the
 * application must protect against cross-site request forgery. We use
 * Spring's {@link CookieCsrfTokenRepository} which stores the CSRF token in
 * a cookie ({@code XSRF-TOKEN}) and expects it back in the
 * {@code X-XSRF-TOKEN} header on state-changing requests.
 *
 * <p>The React frontend reads the token from the cookie and attaches it
 * automatically via the axios request interceptor in {@code api.ts}.
 */
@Configuration
public class CsrfConfig {

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository() {
        return CookieCsrfTokenRepository.withHttpOnlyFalse();
    }

    @Bean
    public XorCsrfTokenRequestAttributeHandler csrfTokenRequestHandler() {
        // XorCsrfTokenRequestAttributeHandler BREACH-protects the CSRF token
        // by XORing it with a random value in the cookie. The server can
        // still validate the original token.
        return new XorCsrfTokenRequestAttributeHandler();
    }
}
