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
    private final OtpService otpService;
    private final EmailService emailService;
    private final UserService userService;
    private final AuditLogService auditLogService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
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
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        auditLogService.record(user.getId(), user.getId(), AuditAction.REGISTER, AuditStatus.SUCCESS,
                "New account registered: " + user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new AuthException("Invalid email or password"));

            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw new AuthException("Invalid email or password");
            }

            ensureAccountActive(user);

            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

            String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

            auditLogService.record(user.getId(), user.getId(), AuditAction.LOGIN_SUCCESS, AuditStatus.SUCCESS,
                    "Login successful for " + request.getEmail());
            return buildAuthResponse(user, accessToken, refreshToken);
        } catch (AuthException ex) {
            auditLogService.record(null, null, AuditAction.LOGIN_FAILURE, AuditStatus.FAILURE,
                    "Failed login attempt for " + request.getEmail() + ": " + ex.getMessage());
            throw ex;
        }
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        try {
            if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
                throw new AuthException("Invalid or expired refresh token");
            }

            String userId = jwtTokenProvider.getUserIdFromToken(request.getRefreshToken());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AuthException("User not found"));

            ensureAccountActive(user);

            String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

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
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        auditLogService.record(user.getId(), user.getId(), AuditAction.OTP_VERIFIED, AuditStatus.SUCCESS,
                "OTP login for " + user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    @Transactional
    public AuthResponse handleOAuthCallback(String email, String fullName, String avatarUrl, String provider) {
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            String username = email.split("@")[0];
            String baseUsername = username;
            int suffix = 1;
            while (userRepository.countByUsername(username) > 0) {
                username = baseUsername + suffix++;
            }

            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode("oauth-" + System.currentTimeMillis()))
                    .fullName(fullName)
                    .username(username)
                    .avatarUrl(avatarUrl)
                    .authProvider(provider)
                    .emailVerified(true)
                    .build();
            user = userRepository.save(user);
        } else {
            ensureAccountActive(user);
            if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
            if (fullName != null) user.setFullName(fullName);
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        auditLogService.record(user.getId(), user.getId(), AuditAction.OAUTH_LOGIN, AuditStatus.SUCCESS,
                "OAuth login via " + provider + " for " + user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    /**
     * Records a logout audit entry. Token invalidation is handled client-side.
     */
    public void logout(String userId) {
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
