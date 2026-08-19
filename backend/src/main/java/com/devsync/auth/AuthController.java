package com.devsync.auth;

import com.devsync.auth.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AccountRecoveryService accountRecoveryService;
    private final RefreshTokenCookie refreshTokenCookie;
    private final AccessTokenCookie accessTokenCookie;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletRequest servletRequest,
                                                 HttpServletResponse servletResponse) {
        AuthResponse response = authService.register(request, clientIp(servletRequest),
                servletRequest.getHeader("User-Agent"));
        return withRefreshCookie(response, servletResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest servletRequest,
                                              HttpServletResponse servletResponse) {
        AuthResponse response = authService.login(request, clientIp(servletRequest),
                servletRequest.getHeader("User-Agent"));
        return withRefreshCookie(response, servletResponse);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshTokenRequest body,
            @CookieValue(value = RefreshTokenCookie.NAME, required = false) String cookieToken,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        String refreshToken = cookieToken;
        if ((refreshToken == null || refreshToken.isBlank()) && body != null) {
            // Fallback for non-browser clients / tests. The browser flow uses the cookie.
            refreshToken = body.getRefreshToken();
        }
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthException("Refresh token is required");
        }

        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken(refreshToken);
        AuthResponse response = authService.refreshToken(request, clientIp(servletRequest),
                servletRequest.getHeader("User-Agent"));
        return withRefreshCookie(response, servletResponse);
    }

    @PostMapping("/otp/send")
    public ResponseEntity<Void> sendOtp(@RequestParam String email) {
        authService.sendOtp(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Boolean>> forgotPassword(@Valid @RequestBody EmailRequest request) {
        // Always the same generic response — the endpoint must not reveal
        // whether the email exists or whether a reset email was sent.
        accountRecoveryService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Boolean>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        accountRecoveryService.resetPassword(request);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/email/verify/request")
    public ResponseEntity<Map<String, Boolean>> requestEmailVerification(@Valid @RequestBody EmailRequest request) {
        // Generic response; already-verified / unknown / rate-limited emails are
        // silently skipped server-side.
        accountRecoveryService.requestEmailVerification(request.getEmail());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<Map<String, Boolean>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        accountRecoveryService.verifyEmail(request.getToken());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request,
                                                  HttpServletRequest servletRequest,
                                                  HttpServletResponse servletResponse) {
        AuthResponse response = authService.verifyOtpAndLogin(request, clientIp(servletRequest),
                servletRequest.getHeader("User-Agent"));
        return withRefreshCookie(response, servletResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) RefreshTokenRequest body,
            @CookieValue(value = RefreshTokenCookie.NAME, required = false) String cookieToken,
            HttpServletResponse servletResponse) {
        String refreshToken = cookieToken;
        if ((refreshToken == null || refreshToken.isBlank()) && body != null) {
            refreshToken = body.getRefreshToken();
        }
        // Revocation is driven by the refresh token (cookie), which is valid even
        // when the short-lived access token has expired — so logout must not
        // require a valid access token.
        authService.logout(userDetails != null ? userDetails.getUsername() : null, refreshToken);
        servletResponse.addCookie(refreshTokenCookie.clear());
        servletResponse.addCookie(accessTokenCookie.clear());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.getCurrentUser(userDetails.getUsername()));
    }

    /**
     * Returns a short-lived access token for WebSocket (STOMP) authentication.
     * The browser cannot attach HttpOnly cookies to WebSocket CONNECT frames,
     * so this endpoint provides a token that can be included in the STOMP
     * Authorization header. The token is valid for 5 minutes — just long enough
     * for the WebSocket handshake.
     */
    @GetMapping("/ws-token")
    public ResponseEntity<Map<String, String>> getWebSocketToken(
            @AuthenticationPrincipal UserDetails userDetails) {
        String accessToken = jwtTokenProvider.generateAccessToken(
                userDetails.getUsername(), userDetails.getUsername());
        return ResponseEntity.ok(Map.of("accessToken", accessToken));
    }

    /**
     * Sets the refresh token as an HttpOnly cookie and removes it from the JSON
     * body so it never reaches JavaScript / logs / browser history.
     */
    private ResponseEntity<AuthResponse> withRefreshCookie(AuthResponse response,
                                                           HttpServletResponse servletResponse) {
        String refreshToken = response.getRefreshToken();
        String accessToken = response.getAccessToken();
        response.setRefreshToken(null);
        // Access token is also removed from the response body and set as an
        // HttpOnly cookie — JavaScript never sees the raw token value.
        response.setAccessToken(null);
        servletResponse.addCookie(refreshTokenCookie.create(refreshToken));
        servletResponse.addCookie(accessTokenCookie.create(accessToken));
        return ResponseEntity.ok(response);
    }

    private String clientIp(HttpServletRequest request) {
        // The refresh-token registry records an IP for audit only. We use the
        // remote address (never the spoofable X-Forwarded-For header) here.
        return request.getRemoteAddr();
    }
}
