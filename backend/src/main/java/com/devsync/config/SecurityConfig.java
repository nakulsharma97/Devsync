package com.devsync.config;

import com.devsync.auth.JwtAuthenticationFilter;
import com.devsync.auth.JwtTokenProvider;
import com.devsync.auth.RateLimitingFilter;
import com.devsync.ratelimit.RateLimiter;
import com.devsync.ratelimit.SpamProtectionFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final RateLimitingFilter rateLimitingFilter;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final RateLimiter rateLimiter;

    /** HSTS is HTTPS-only: enabled via app.security.hsts (true in the prod profile). */
    @org.springframework.beans.factory.annotation.Value("${app.security.hsts:false}")
    private boolean hstsEnabled;

    @org.springframework.beans.factory.annotation.Value("${app.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @org.springframework.beans.factory.annotation.Value("${app.rate-limit.invite.per-minute:10}")
    private int invitePerMinute;

    @org.springframework.beans.factory.annotation.Value("${app.rate-limit.trust-x-forwarded-for:false}")
    private boolean trustXForwardedFor;

    /**
     * Resolves lazily: a ClientRegistrationRepository only exists when OAuth2
     * client registrations are configured (spring.security.oauth2.client.*).
     */
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    @Autowired
    @Lazy
    private OAuth2Config oAuth2Config;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF disabled because we use stateless JWT Bearer tokens, not cookies.
            // All authenticated requests require an Authorization: Bearer <token> header.
            // If cookie-based auth is ever added, CSRF protection MUST be re-enabled.
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> {
                // Defense-in-depth for the JSON API: X-Content-Type-Options
                // (nosniff) is on by default; framing and referrer leakage are
                // neutralized explicitly. CSP for the React SPA is enforced at
                // the nginx edge.
                headers.frameOptions(frame -> frame.deny());
                headers.referrerPolicy(referrer ->
                        referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
                // Strict-Transport-Security only when HTTPS is guaranteed in front
                // of the app (prod profile). Never advertise HSTS over plain HTTP.
                if (hstsEnabled) {
                    headers.httpStrictTransportSecurity(hsts ->
                            hsts.includeSubDomains(true).maxAgeInSeconds(31536000L));
                }
            })
            .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                // Stateless JSON API: unauthenticated requests get 401, never an HTML redirect.
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"status\":401,\"message\":\"Unauthorized\"}");
            }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/github/callback").permitAll()
                .requestMatchers("/api/webhooks/github").permitAll()
                // Payment webhook: publicly reachable over HTTPS, but every request
                // must carry a verified provider signature (rejected otherwise).
                .requestMatchers("/api/billing/webhook/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/oauth2/**", "/login/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class)
            // Spam protection must see the authenticated user, so it runs AFTER
            // authentication (per-user quota) rather than before it (IP only).
            .addFilterAfter(spamProtectionFilter(), UsernamePasswordAuthenticationFilter.class);

        // OAuth2 login is optional: only register the filter chain when OAuth2
        // client registrations are configured (e.g. application-oauth.yml).
        // Without them the app still boots and /oauth2/authorization endpoints
        // simply return 404 instead of failing the whole context at startup.
        if (clientRegistrationRepository.getIfAvailable() != null) {
            http.oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oAuth2Config.oAuth2UserService())
                )
                .successHandler(oAuth2Config.oAuth2SuccessHandler())
            );
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService);
    }

    /**
     * Invitation / join-request spam protection. Defaults: 10 POSTs per minute
     * per user (or per IP when unauthenticated). Toggle with app.rate-limit.enabled
     * and tune with app.rate-limit.invite.per-minute.
     */
    @Bean
    public SpamProtectionFilter spamProtectionFilter() {
        return new SpamProtectionFilter(rateLimiter, rateLimitEnabled, invitePerMinute, trustXForwardedFor);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
