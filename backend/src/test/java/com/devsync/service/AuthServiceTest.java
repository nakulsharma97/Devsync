package com.devsync.service;

import com.devsync.dto.AuthResponse;
import com.devsync.dto.RegisterRequest;
import com.devsync.entity.User;
import com.devsync.enums.Role;
import com.devsync.exception.BadRequestException;
import com.devsync.repository.UserRepository;
import com.devsync.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRegisterRequest;
    private User testUser;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setEmail("test@example.com");
        validRegisterRequest.setPassword("password123");
        validRegisterRequest.setFullName("Test User");
        validRegisterRequest.setUsername("testuser");

        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encodedPassword")
                .fullName("Test User")
                .username("testuser")
                .role(Role.DEVELOPER)
                .build();
    }

    @Test
    void register_ShouldSucceed_WhenValidRequest() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtTokenProvider.generateToken(anyLong(), anyString(), anyString())).thenReturn("jwt-token");

        AuthResponse response = authService.register(validRegisterRequest);

        assertNotNull(response);
        assertEquals("test@example.com", response.getEmail());
        assertEquals("Test User", response.getFullName());
        assertEquals("DEVELOPER", response.getRole());
        assertEquals("jwt-token", response.getToken());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("test@example.com", savedUser.getEmail());
        assertEquals("encodedPassword", savedUser.getPassword());
        assertEquals("testuser", savedUser.getUsername());
        assertEquals("Test User", savedUser.getFullName());
        assertEquals(Role.DEVELOPER, savedUser.getRole());
    }

    @Test
    void register_ShouldThrow_WhenEmailExists() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> authService.register(validRegisterRequest));
        assertEquals("Email already registered", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_ShouldThrow_WhenUsernameTaken() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> authService.register(validRegisterRequest));
        assertEquals("Username already taken", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_ShouldSucceed_WithValidCredentials() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(jwtTokenProvider.generateToken(1L, "test@example.com", "DEVELOPER")).thenReturn("jwt-token");

        AuthResponse response = authService.login("test@example.com", "password123");

        assertNotNull(response);
        assertEquals("test@example.com", response.getEmail());
        assertEquals("Test User", response.getFullName());
        assertEquals("jwt-token", response.getToken());

        verify(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken("test@example.com", "password123"));
    }

    @Test
    void login_ShouldThrow_WhenBadCredentials() {
        doThrow(BadCredentialsException.class)
                .when(authenticationManager)
                .authenticate(any());

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> authService.login("test@example.com", "wrongpass"));
        assertEquals("Invalid email or password", exception.getMessage());
    }

    @Test
    void login_ShouldThrow_WhenUserNotFound() {
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> authService.login("nonexistent@example.com", "password123"));
        assertEquals("User not found", exception.getMessage());
    }
}
