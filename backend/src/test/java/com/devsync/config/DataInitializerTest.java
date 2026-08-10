package com.devsync.config;

import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    private static final String ADMIN_EMAIL = "admin@devsync.com";
    private static final String ADMIN_PASSWORD = "Str0ng!Admin#Pass";

    @Mock
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private AdminProperties adminProperties;
    private DataInitializer dataInitializer;

    @BeforeEach
    void setUp() {
        adminProperties = new AdminProperties();
        dataInitializer = new DataInitializer(userRepository, passwordEncoder, adminProperties);
    }

    @Test
    void run_whenSeedingDisabled_shouldNotTouchAnyUser() {
        adminProperties.setSeedEnabled(false);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword(ADMIN_PASSWORD);

        dataInitializer.run();

        verify(userRepository, never()).save(any());
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void run_whenEnabledButEmailMissing_shouldNotCreateAdmin() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail("  ");
        adminProperties.setSeedPassword(ADMIN_PASSWORD);

        dataInitializer.run();

        verify(userRepository, never()).save(any());
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void run_whenEnabledButPasswordMissing_shouldNotCreateAdmin() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword("");

        dataInitializer.run();

        verify(userRepository, never()).save(any());
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void run_whenNoExistingAdmin_shouldCreateHardenedAdmin() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword(ADMIN_PASSWORD);
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("admin")).thenReturn(false);

        dataInitializer.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();

        assertThat(saved.getEmail()).isEqualTo(ADMIN_EMAIL);
        assertThat(saved.getFullName()).isEqualTo("DevSync Admin");
        assertThat(saved.getUsername()).isEqualTo("admin");
        assertThat(saved.getRole()).isEqualTo(User.Role.ADMIN);
        assertThat(saved.isEmailVerified()).isTrue();
        assertThat(saved.isBlocked()).isFalse();
        assertThat(saved.isDeleted()).isFalse();
        assertThat(saved.getAuthProvider()).isEqualTo("email");

        // Password must be BCrypt encoded, never stored in plaintext.
        assertThat(saved.getPassword()).isNotEqualTo(ADMIN_PASSWORD);
        assertThat(saved.getPassword()).startsWith("$2");
        assertThat(passwordEncoder.matches(ADMIN_PASSWORD, saved.getPassword())).isTrue();
    }

    @Test
    void run_whenExistingAdmin_shouldNotOverwritePasswordOrDuplicate() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword(ADMIN_PASSWORD);

        User existingAdmin = User.builder()
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode("previous-hash"))
                .fullName("Original Admin")
                .username("original-admin")
                .role(User.Role.ADMIN)
                .emailVerified(true)
                .build();
        existingAdmin.setId("existing-id");
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(existingAdmin));

        dataInitializer.run();

        verify(userRepository, never()).save(any());
        assertThat(passwordEncoder.matches("previous-hash", existingAdmin.getPassword())).isTrue();
        assertThat(existingAdmin.getFullName()).isEqualTo("Original Admin");
        assertThat(existingAdmin.getRole()).isEqualTo(User.Role.ADMIN);
    }

    @Test
    void run_whenExistingBlockedAdmin_shouldNotTouchIt() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword(ADMIN_PASSWORD);

        User existingAdmin = User.builder()
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode("previous-hash"))
                .fullName("Original Admin")
                .username("original-admin")
                .role(User.Role.ADMIN)
                .emailVerified(true)
                .blocked(true)
                .build();
        existingAdmin.setId("existing-id");
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(existingAdmin));

        dataInitializer.run();

        verify(userRepository, never()).save(any());
        assertThat(existingAdmin.isBlocked()).isTrue();
    }

    @Test
    void run_whenEmailBelongsToNormalUser_shouldNotSilentlyPromote() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword(ADMIN_PASSWORD);

        User existingUser = User.builder()
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode("user-password"))
                .fullName("Regular User")
                .username("regular-user")
                .role(User.Role.USER)
                .emailVerified(true)
                .build();
        existingUser.setId("existing-id");
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(existingUser));

        dataInitializer.run();

        verify(userRepository, never()).save(any());
        verify(userRepository, never()).saveAndFlush(any());
        assertThat(existingUser.getRole()).isEqualTo(User.Role.USER);
        assertThat(passwordEncoder.matches("user-password", existingUser.getPassword())).isTrue();
    }

    @Test
    void run_whenUsernameTaken_shouldGenerateUniqueUsername() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword(ADMIN_PASSWORD);
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("admin")).thenReturn(true);
        when(userRepository.existsByUsername("admin1")).thenReturn(false);

        dataInitializer.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("admin1");
    }

    @Test
    void run_whenPasswordTooShort_shouldWarnButStillCreate() {
        adminProperties.setSeedEnabled(true);
        adminProperties.setSeedEmail(ADMIN_EMAIL);
        adminProperties.setSeedPassword("short");
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("admin")).thenReturn(false);

        dataInitializer.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(passwordEncoder.matches("short", captor.getValue().getPassword())).isTrue();
    }
}
