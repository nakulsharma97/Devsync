package com.devsync.config;

import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed-email:admin@devsync.com}")
    private String adminSeedEmail;

    @Value("${app.admin.seed-password:Admin@123}")
    private String adminSeedPassword;

    @Override
    @Transactional
    public void run(String... args) {
        seedDefaultAdmin();
    }

    private void seedDefaultAdmin() {
        if (userRepository.existsByEmail(adminSeedEmail)) {
            return;
        }

        String username = "admin";
        String baseUsername = username;
        int suffix = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + suffix++;
        }

        User admin = User.builder()
                .email(adminSeedEmail)
                .password(passwordEncoder.encode(adminSeedPassword))
                .fullName("DevSync Admin")
                .username(username)
                .role(User.Role.ADMIN)
                .emailVerified(true)
                .authProvider("email")
                .build();

        userRepository.save(admin);
        log.info("Seeded default admin user: {}", adminSeedEmail);
    }
}
