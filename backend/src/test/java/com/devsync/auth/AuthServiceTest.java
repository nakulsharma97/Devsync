package com.devsync.auth;

import com.devsync.auth.dto.*;
import com.devsync.user.UserService;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private OtpService otpService;
    @Mock private UserService userService;

    @Mock private EmailService emailService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private AuthService authService;

    @Captor private ArgumentCaptor<User> userCaptor;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtTokenProvider, otpService, emailService, userService);
    }

    // ── Register ─────────────────────────────────────────────

    @Test
    void register_shouldCreateUserAndReturnTokens() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@test.com");
        request.setPassword("password123");
        request.setFullName("New User");
        request.setUsername("newuser");

        when(userRepository.countByEmail("new@test.com")).thenReturn(0L);
        when(userRepository.countByUsername("newuser")).thenReturn(0L);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId("user-uuid-123");
            return saved;
        });
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(anyString())).thenReturn("refresh-token");

        AuthResponse response = authService.register(request);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getUser().getEmail()).isEqualTo("new@test.com");
        assertThat(response.getUser().getFullName()).isEqualTo("New User");

        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();
        assertThat(saved.getEmail()).isEqualTo("new@test.com");
        assertThat(saved.getPassword()).isNotEqualTo("password123"); // must be encoded
        assertThat(saved.getPassword()).startsWith("$2a$"); // BCrypt prefix
        assertThat(saved.getAuthProvider()).isEqualTo("email");
        assertThat(saved.getRole()).isEqualTo(User.Role.USER);
    }

    @Test
    void register_shouldThrowWhenEmailTaken() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("taken@test.com");
        request.setPassword("password123");
        request.setFullName("Taken User");

        when(userRepository.countByEmail("taken@test.com")).thenReturn(1L);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Email already in use");
    }

    @Test
    void register_shouldThrowWhenUsernameTaken() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("user@test.com");
        request.setPassword("password123");
        request.setFullName("Test User");
        request.setUsername("occupied");

        when(userRepository.countByEmail("user@test.com")).thenReturn(0L);
        when(userRepository.countByUsername("occupied")).thenReturn(1L);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Username already taken");
    }

    @Test
    void register_shouldAutoGenerateUsernameWhenBlank() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("jane@example.com");
        request.setPassword("password123");
        request.setFullName("Jane Doe");
        request.setUsername(null);

        when(userRepository.countByEmail("jane@example.com")).thenReturn(0L);
        when(userRepository.countByUsername("jane")).thenReturn(0L);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("id-456");
            return u;
        });
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("at");
        when(jwtTokenProvider.generateRefreshToken(anyString())).thenReturn("rt");

        authService.register(request);

        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getUsername()).isEqualTo("jane");
    }

    // ── Login ────────────────────────────────────────────────

    @Test
    void login_shouldReturnTokensForValidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        User user = User.builder()
                .email("test@test.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .build();
        user.setId("user-id");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken("user-id", "test@test.com")).thenReturn("at");
        when(jwtTokenProvider.generateRefreshToken("user-id")).thenReturn("rt");

        AuthResponse response = authService.login(request);

        assertThat(response.getAccessToken()).isEqualTo("at");
        assertThat(response.getRefreshToken()).isEqualTo("rt");
        assertThat(response.getUser().getId()).isEqualTo("user-id");
    }

    @Test
    void login_shouldThrowForWrongPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("wrong-password");

        User user = User.builder()
                .email("test@test.com")
                .password(passwordEncoder.encode("correct-password"))
                .build();
        user.setId("user-id");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void login_shouldThrowForNonexistentEmail() {
        LoginRequest request = new LoginRequest();
        request.setEmail("ghost@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("ghost@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void login_shouldUpdateLastLoginAt() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        User user = User.builder()
                .email("test@test.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .lastLoginAt(null)
                .build();
        user.setId("user-id");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("at");
        when(jwtTokenProvider.generateRefreshToken(anyString())).thenReturn("rt");

        authService.login(request);

        assertThat(user.getLastLoginAt()).isNotNull();
        verify(userRepository).save(user);
    }

    // ── Refresh Token ────────────────────────────────────────

    @Test
    void refreshToken_shouldReturnNewTokens() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("valid-refresh-token");

        User user = User.builder()
                .email("test@test.com")
                .build();
        user.setId("user-id");

        when(jwtTokenProvider.validateToken("valid-refresh-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("valid-refresh-token")).thenReturn("user-id");
        when(userRepository.findById("user-id")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken("user-id", "test@test.com")).thenReturn("new-at");
        when(jwtTokenProvider.generateRefreshToken("user-id")).thenReturn("new-rt");

        AuthResponse response = authService.refreshToken(request);

        assertThat(response.getAccessToken()).isEqualTo("new-at");
        assertThat(response.getRefreshToken()).isEqualTo("new-rt");
    }

    @Test
    void refreshToken_shouldThrowForExpiredToken() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("expired-token");

        when(jwtTokenProvider.validateToken("expired-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired refresh token");
    }

    // ── OTP ──────────────────────────────────────────────────

    @Test
    void sendOtp_shouldGenerateAndSend() {
        User user = User.builder().email("otp@test.com").build();
        user.setId("uid");
        when(userRepository.countByEmail("otp@test.com")).thenReturn(1L);
        when(otpService.generateOtp("otp@test.com")).thenReturn("123456");

        authService.sendOtp("otp@test.com");

        verify(otpService).generateOtp("otp@test.com");
        verify(emailService).sendOtpEmail("otp@test.com", "123456");
    }

    @Test
    void sendOtp_shouldNotRevealIfEmailMissing() {
        when(userRepository.countByEmail("missing@test.com")).thenReturn(0L);

        authService.sendOtp("missing@test.com");

        verify(otpService, never()).generateOtp(anyString());
        verify(emailService, never()).sendOtpEmail(anyString(), anyString());
    }

    @Test
    void verifyOtpAndLogin_shouldReturnTokens() {
        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("otp@test.com");
        request.setOtp("123456");

        User user = User.builder()
                .email("otp@test.com")
                .fullName("OTP User")
                .emailVerified(false)
                .build();
        user.setId("user-id");

        when(otpService.validateOtp("otp@test.com", "123456")).thenReturn(true);
        when(userRepository.findByEmail("otp@test.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken("user-id", "otp@test.com")).thenReturn("at");
        when(jwtTokenProvider.generateRefreshToken("user-id")).thenReturn("rt");

        AuthResponse response = authService.verifyOtpAndLogin(request);

        assertThat(response.getAccessToken()).isEqualTo("at");
        assertThat(response.getUser().getEmail()).isEqualTo("otp@test.com");
        assertThat(user.isEmailVerified()).isTrue();
    }

    @Test
    void verifyOtpAndLogin_shouldThrowForInvalidOtp() {
        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("otp@test.com");
        request.setOtp("wrong");

        when(otpService.validateOtp("otp@test.com", "wrong")).thenReturn(false);

        assertThatThrownBy(() -> authService.verifyOtpAndLogin(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired OTP");
    }
    // ── Blocked / Deleted account enforcement ─────────────────

    @Test
    void login_shouldThrow_WhenAccountBlocked() {
        LoginRequest request = new LoginRequest();
        request.setEmail("blocked@test.com");
        request.setPassword("password123");

        User user = User.builder()
                .email("blocked@test.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Blocked User")
                .blocked(true)
                .build();
        user.setId("user-id");

        when(userRepository.findByEmail("blocked@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("blocked");

        verify(jwtTokenProvider, never()).generateAccessToken(anyString(), anyString());
    }

    @Test
    void login_shouldThrow_WhenAccountDeleted() {
        LoginRequest request = new LoginRequest();
        request.setEmail("deleted@test.com");
        request.setPassword("password123");

        User user = User.builder()
                .email("deleted@test.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Deleted User")
                .deleted(true)
                .build();
        user.setId("user-id");

        when(userRepository.findByEmail("deleted@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("deleted");
    }

    @Test
    void refreshToken_shouldThrow_WhenAccountBlocked() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("valid-refresh-token");

        User user = User.builder()
                .email("test@test.com")
                .blocked(true)
                .build();
        user.setId("user-id");

        when(jwtTokenProvider.validateToken("valid-refresh-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("valid-refresh-token")).thenReturn("user-id");
        when(userRepository.findById("user-id")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("blocked");

        verify(jwtTokenProvider, never()).generateAccessToken(anyString(), anyString());
    }

    @Test
    void verifyOtpAndLogin_shouldThrow_WhenAccountBlocked() {
        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("otp@test.com");
        request.setOtp("123456");

        User user = User.builder()
                .email("otp@test.com")
                .fullName("OTP User")
                .blocked(true)
                .build();
        user.setId("user-id");

        when(otpService.validateOtp("otp@test.com", "123456")).thenReturn(true);
        when(userRepository.findByEmail("otp@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.verifyOtpAndLogin(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("blocked");
    }
}
