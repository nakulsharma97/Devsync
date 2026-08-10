package com.devsync.user.repository;

import com.devsync.user.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(UserRepositoryTest.AuditingConfig.class)
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @TestConfiguration
    @EnableJpaAuditing
    static class AuditingConfig {
    }

    @Test
    void existsByEmail_shouldReturnTrue_OnlyWhenUserExists() {
        userRepository.save(user("dev@test.com", "dev", User.Role.USER));

        assertThat(userRepository.existsByEmail("dev@test.com")).isTrue();
        assertThat(userRepository.existsByEmail("missing@test.com")).isFalse();
    }

    @Test
    void existsByUsername_shouldReturnTrue_OnlyWhenUsernameExists() {
        userRepository.save(user("dev@test.com", "dev", User.Role.USER));

        assertThat(userRepository.existsByUsername("dev")).isTrue();
        assertThat(userRepository.existsByUsername("ghost")).isFalse();
    }

    @Test
    void existsByRole_andCountByRole_shouldQueryAdminsDirectly() {
        userRepository.save(user("admin@test.com", "admin", User.Role.ADMIN));
        userRepository.save(user("dev@test.com", "dev", User.Role.USER));

        assertThat(userRepository.existsByRole(User.Role.ADMIN)).isTrue();
        assertThat(userRepository.countByRole(User.Role.ADMIN)).isEqualTo(1);
        assertThat(userRepository.countByRole(User.Role.USER)).isEqualTo(1);
    }

    @Test
    void existsByRole_andCountByRole_shouldReturnFalseAndZero_WhenNoAdmins() {
        userRepository.save(user("dev@test.com", "dev", User.Role.USER));

        assertThat(userRepository.existsByRole(User.Role.ADMIN)).isFalse();
        assertThat(userRepository.countByRole(User.Role.ADMIN)).isZero();
    }

    @Test
    void countByRoleAndDeletedFalseAndBlockedFalse_shouldCountOnlyActiveAdmins() {
        User activeAdmin = user("admin@test.com", "admin", User.Role.ADMIN);
        userRepository.save(activeAdmin);

        User blockedAdmin = user("blocked-admin@test.com", "blocked-admin", User.Role.ADMIN);
        blockedAdmin.setBlocked(true);
        userRepository.save(blockedAdmin);

        User deletedAdmin = user("deleted-admin@test.com", "deleted-admin", User.Role.ADMIN);
        deletedAdmin.setDeleted(true);
        userRepository.save(deletedAdmin);

        assertThat(userRepository.countByRoleAndDeletedFalseAndBlockedFalse(User.Role.ADMIN)).isEqualTo(1);
        assertThat(userRepository.countByRoleAndDeletedFalseAndBlockedFalse(User.Role.USER)).isZero();
    }

    @Test
    void searchAdminUsers_shouldFilterByCreatedDateRange() {
        userRepository.save(user("dev@test.com", "dev", User.Role.USER));

        Instant from = Instant.now().minus(1, ChronoUnit.DAYS);
        Instant to = Instant.now().plus(1, ChronoUnit.DAYS);
        Page<User> inRange = userRepository.searchAdminUsers(
                null, null, null, from, to, PageRequest.of(0, 10));
        assertThat(inRange.getTotalElements()).isEqualTo(1);

        // Users created strictly after this future bound are excluded.
        Page<User> futureOnly = userRepository.searchAdminUsers(
                null, null, null, Instant.now().plus(2, ChronoUnit.DAYS), null, PageRequest.of(0, 10));
        assertThat(futureOnly.getTotalElements()).isZero();
    }

    @Test
    void searchUsers_shouldExcludeDeletedUsers() {
        userRepository.save(user("dev@test.com", "dev", User.Role.USER));
        User deleted = user("gone@test.com", "gone", User.Role.USER);
        deleted.setDeleted(true);
        userRepository.save(deleted);

        List<User> active = userRepository.searchUsers("dev", "someone-else");
        assertThat(active).extracting(User::getUsername).containsExactly("dev");

        List<User> deletedOnly = userRepository.searchUsers("gone", "someone-else");
        assertThat(deletedOnly).isEmpty();
    }

    private User user(String email, String username, User.Role role) {
        return User.builder()
                .email(email)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .fullName("Test User")
                .username(username)
                .role(role)
                .emailVerified(true)
                .authProvider("email")
                .build();
    }
}
