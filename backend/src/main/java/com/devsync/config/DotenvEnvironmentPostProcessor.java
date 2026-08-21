package com.devsync.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Loads environment variables from the project-root {@code .env} file into
 * Spring Boot's property sources. This runs very early during startup — before
 * any beans are created — so values are available to {@code @Value} annotations
 * and {@code application.yml} property placeholders.
 *
 * <p>The loader is intentionally simple: it reads {@code KEY=VALUE} lines,
 * skips comments and blank lines, and does NOT override properties that are
 * already set as real OS environment variables or system properties. This means
 * Docker/CI environment variables always win over the local {@code .env}.</p>
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {
        // Walk up from CWD looking for .env
        Path envFile = findEnvFile(Paths.get("").toAbsolutePath());
        if (envFile == null) {
            return; // No .env found — rely on OS env vars / application.yml defaults
        }

        Map<String, Object> props = new HashMap<>();
        try {
            for (String line : Files.readAllLines(envFile)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
                int eq = trimmed.indexOf('=');
                if (eq <= 0) continue;
                String key = trimmed.substring(0, eq).trim();
                String value = trimmed.substring(eq + 1).trim();
                // Only add if NOT already set by a real OS env var or system property.
                // This ensures Docker/CI env vars always win.
                if (System.getenv(key) == null && System.getProperty(key) == null) {
                    props.put(key, value);
                }
            }
        } catch (IOException e) {
            // Silently skip — .env loading is best-effort
            return;
        }

        if (!props.isEmpty()) {
            environment.getPropertySources().addLast(
                new MapPropertySource("dotenv", props));
        }
    }

    /**
     * Walk up from the given directory looking for a .env file.
     */
    private Path findEnvFile(Path dir) {
        Path current = dir;
        for (int i = 0; i < 5; i++) { // max 5 levels up
            Path candidate = current.resolve(".env");
            if (Files.isRegularFile(candidate)) return candidate;
            current = current.getParent();
            if (current == null) break;
        }
        return null;
    }
}
