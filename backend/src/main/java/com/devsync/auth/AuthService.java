package com.devsync.auth;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.auth.dto.*;
import com.devsync.user.UserService;
import com.devsync.user.dto.UserResponse;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;
    private final EmailService emailService;
    private final UserService userService;
    private final AuditLogService auditLogService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        return register(request, null, null);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress, String userAgent) {
        if (userRepository.countByEmail(request.getEmail()) > 0) {
            throw new AuthException("Email already in use", HttpStatus.CONFLICT);
        }

        if (request.getUsername() != null && userRepository.countByUsername(request.getUsername()) > 0) {
            throw new AuthException("Username already taken", HttpStatus.CONFLICT);
        }

        String username = request.getUsername();
        if (username == null || username.isBlank()) {
            username = request.getEmail().split("@")[0];
            String baseUsername = username;
            int suffix = 1;
            while (userRepository.countByUsername(username) > 0) {
                username = baseUsername + suffix++;
            }
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .username(username)
                .authProvider("email")
                .build();

        user = userRepository.save(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = refreshTokenService.issue(user.getId(), ipAddress, userAgent);

        auditLogService.record(user.getId(), user.getId(), AuditAction.REGISTER, AuditStatus.SUCCESS,
                "New account registered: " + user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    public AuthResponse login(LoginRequest request) {
        return login(request, null, null);
    }

    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String identifier = request.getEmail();
        try {
            // The identifier field accepts either the email address or the
            // username. The exact same failure message is returned for a missing
            // user and a wrong password, so neither path reveals which one it
            // was (no username/email enumeration).
            User user = findUserByIdentifier(identifier)
                    .orElseThrow(() -> new AuthException("Invalid email or password"));

            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw new AuthException("Invalid email or password");
            }

            ensureAccountActive(user);

            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

            String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
            String refreshToken = refreshTokenService.issue(user.getId(), ipAddress, userAgent);

            auditLogService.record(user.getId(), user.getId(), AuditAction.LOGIN_SUCCESS, AuditStatus.SUCCESS,
                    "Login successful for " + request.getEmail());
            return buildAuthResponse(user, accessToken, refreshToken);
        } catch (AuthException ex) {
            auditLogService.record(null, null, AuditAction.LOGIN_FAILURE, AuditStatus.FAILURE,
                    "Failed login attempt for " + identifier + ": " + ex.getMessage());
            throw ex;
        }
    }

    /**
     * Detects whether the supplied identifier is an email address or a username
     * and looks the account up accordingly. An "@" makes it an email; otherwise
     * it is treated as a username.
     */
    private java.util.Optional<User> findUserByIdentifier(String identifier) {
        if (identifier != null && identifier.contains("@")) {
            return userRepository.findByEmail(identifier);
        }
        return userRepository.findByUsername(identifier);
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        return refreshToken(request, null, null);
    }

    public AuthResponse refreshToken(RefreshTokenRequest request, String ipAddress, String userAgent) {
        try {
            // Rotation validates the presented token (type=refresh, signature, expiry,
            // registry lookup, reuse detection) and issues a new one.
            String refreshToken = refreshTokenService.rotate(request.getRefreshToken(), ipAddress, userAgent);

            String userId = jwtTokenProvider.getUserIdFromToken(request.getRefreshToken());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AuthException("User not found"));

            ensureAccountActive(user);

            String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());

            auditLogService.record(user.getId(), user.getId(), AuditAction.JWT_REFRESH, AuditStatus.SUCCESS,
                    "Token refreshed for " + user.getEmail());
            return buildAuthResponse(user, accessToken, refreshToken);
        } catch (AuthException ex) {
            auditLogService.record(null, null, AuditAction.JWT_REFRESH, AuditStatus.FAILURE,
                    "Refresh token rejected: " + ex.getMessage());
            throw ex;
        }
    }

    public void sendOtp(String email) {
        if (userRepository.countByEmail(email) == 0) {
            return;
        }
        String otp = otpService.generateOtp(email);
        try {
            emailService.sendOtpEmail(email, otp);
        } catch (Exception e) {
            log.warn("Failed to send OTP email to {}: {}", email, e.getMessage());
        }
    }

    public AuthResponse verifyOtpAndLogin(VerifyOtpRequest request) {
        return verifyOtpAndLogin(request, null, null);
    }

    public AuthResponse verifyOtpAndLogin(VerifyOtpRequest request, String ipAddress, String userAgent) {
        if (!otpService.validateOtp(request.getEmail(), request.getOtp())) {
            throw new AuthException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        ensureAccountActive(user);

        user.setLastLoginAt(Instant.now());
        user.setEmailVerified(true);
        userRepository.save(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = refreshTokenService.issue(user.getId(), ipAddress, userAgent);

        auditLogService.record(user.getId(), user.getId(), AuditAction.OTP_VERIFIED, AuditStatus.SUCCESS,
                "OTP login for " + user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    /**
     * Records a logout audit entry and revokes the presented refresh token
     * server-side, so a stolen token cannot be replayed after logout. The actor
     * may be null when only the cookie is presented (access token expired).
     */
    @Transactional
    public void logout(String userId, String refreshToken) {
        refreshTokenService.revoke(refreshToken);
        auditLogService.record(userId, userId, AuditAction.LOGOUT, AuditStatus.SUCCESS, "User logged out");
    }

    /**
     * Blocks login/refresh for blocked or deleted accounts.
     */
    private void ensureAccountActive(User user) {
        if (user.isDeleted()) {
            throw new AuthException("This account has been deleted", HttpStatus.FORBIDDEN);
        }
        if (user.isBlocked()) {
            throw new AuthException("Your account has been blocked. Please contact support.", HttpStatus.FORBIDDEN);
        }
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(AuthResponse.UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .username(user.getUsername())
                        .avatarUrl(user.getAvatarUrl())
                        .role(user.getRole().name())
                        .build())
                .build();
    }

    public UserResponse getCurrentUser(String userId) {
        return userService.getUserById(userId);
    }
}
