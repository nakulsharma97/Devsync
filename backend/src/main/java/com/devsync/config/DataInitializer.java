package com.devsync.config;

import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Seeds a bootstrap admin account from environment-driven configuration.
 *
 * <p>Security contract:
 * <ul>
 *   <li>Seeding is opt-in ({@code app.admin.seed-enabled=false} by default).</li>
 *   <li>Both {@code DEVSYNC_ADMIN_EMAIL} and {@code DEVSYNC_ADMIN_PASSWORD} must be set
 *       before any account is created - there are no default credentials.</li>
 *   <li>The password is only ever BCrypt-encoded via {@link PasswordEncoder} and is never
 *       logged or exposed through any API.</li>
 *   <li>An existing account with the configured email is never duplicated, never has its
 *       password/name overwritten, and a non-admin account is never silently promoted.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private static final String ADMIN_FULL_NAME = "DevSync Admin";
    private static final String ADMIN_USERNAME_BASE = "admin";
    private static final int MIN_ADMIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminProperties adminProperties;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminIfConfigured();
    }

    private void seedAdminIfConfigured() {
        if (!adminProperties.isSeedEnabled()) {
            log.info("Admin seeding disabled. To seed a bootstrap admin, set DEVSYNC_ADMIN_SEED_ENABLED=true "
                    + "with DEVSYNC_ADMIN_EMAIL and DEVSYNC_ADMIN_PASSWORD.");
            return;
        }

        String email = trimmed(adminProperties.getSeedEmail());
        String password = adminProperties.getSeedPassword();

        if (email == null || password == null || password.isBlank()) {
            log.error("Admin seeding is enabled but DEVSYNC_ADMIN_EMAIL and DEVSYNC_ADMIN_PASSWORD must both be "
                    + "set. Skipping admin seed - no account was created or modified.");
            return;
        }

        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            handleExistingUser(email, existing.get());
            return;
        }

        if (password.length() < MIN_ADMIN_PASSWORD_LENGTH) {
            log.warn("Configured admin password for {} is shorter than {} characters. "
                    + "Consider using a stronger password.", email, MIN_ADMIN_PASSWORD_LENGTH);
        }

        User admin = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .fullName(ADMIN_FULL_NAME)
                .username(uniqueUsername(ADMIN_USERNAME_BASE))
                .role(User.Role.ADMIN)
                .emailVerified(true)
                .authProvider("email")
                .blocked(false)
                .deleted(false)
                .build();

        userRepository.save(admin);
        log.info("Seeded bootstrap admin account for {} (role=ADMIN, emailVerified=true).", email);
    }

    /**
     * The configured email already exists. Never modify the account.
     */
    private void handleExistingUser(String email, User existing) {
        if (existing.getRole() == User.Role.ADMIN) {
            if (existing.isBlocked() || existing.isDeleted()) {
                log.warn("Configured admin email {} belongs to an existing admin account that is {} - "
                        + "that account cannot log in until it is restored.",
                        email, existing.isBlocked() ? "blocked" : "deleted");
            }
            log.info("Admin account already exists for {} - skipping seed. The existing password, name and "
                    + "role were NOT modified.", email);
            return;
        }

        log.error("Configured admin email {} belongs to an existing non-admin account. Refusing to seed or "
                + "silently promote it. Grant the ADMIN role manually through the admin panel, or set "
                + "DEVSYNC_ADMIN_EMAIL to a different address.", email);
    }

    private String uniqueUsername(String base) {
        String username = base;
        int suffix = 1;
        while (userRepository.existsByUsername(username)) {
            username = base + suffix++;
        }
        return username;
    }

    private String trimmed(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
