package com.devsync.auth;

import com.devsync.auth.dto.*;
import com.devsync.user.dto.UserResponse;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final OtpService otpService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AuthException("Email already in use", HttpStatus.CONFLICT);
        }

        if (request.getUsername() != null && userRepository.existsByUsername(request.getUsername())) {
            throw new AuthException("Username already taken", HttpStatus.CONFLICT);
        }

        String username = request.getUsername();
        if (username == null || username.isBlank()) {
            username = request.getEmail().split("@")[0];
            String baseUsername = username;
            int suffix = 1;
            while (userRepository.existsByUsername(username)) {
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

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AuthException("Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
            throw new AuthException("Invalid or expired refresh token");
        }

        String userId = jwtTokenProvider.getUserIdFromToken(request.getRefreshToken());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthException("User not found"));

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    public void sendOtp(String email) {
        if (!userRepository.existsByEmail(email)) {
            // Don't reveal whether email exists — silently "send" OTP
            return;
        }
        String otp = otpService.generateOtp(email);
        // In production, send email here: emailService.sendOtp(email, otp);
        System.out.println("OTP for " + email + ": " + otp);
    }

    public AuthResponse verifyOtpAndLogin(VerifyOtpRequest request) {
        if (!otpService.validateOtp(request.getEmail(), request.getOtp())) {
            throw new AuthException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        user.setLastLoginAt(Instant.now());
        user.setEmailVerified(true);
        userRepository.save(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    @Transactional
    public AuthResponse handleOAuthCallback(String email, String fullName, String avatarUrl, String provider) {
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            String username = email.split("@")[0];
            String baseUsername = username;
            int suffix = 1;
            while (userRepository.existsByUsername(username)) {
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
            if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
            if (fullName != null) user.setFullName(fullName);
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return buildAuthResponse(user, accessToken, refreshToken);
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthException("User not found"));
        return toUserResponse(user);
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .company(user.getCompany())
                .location(user.getLocation())
                .githubUrl(user.getGithubUrl())
                .twitterUrl(user.getTwitterUrl())
                .websiteUrl(user.getWebsiteUrl())
                .role(user.getRole().name())
                .emailVerified(user.isEmailVerified())
                .authProvider(user.getAuthProvider())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
