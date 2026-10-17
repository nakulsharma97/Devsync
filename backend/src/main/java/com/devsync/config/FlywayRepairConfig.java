package com.devsync.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * One-off recovery switch for a failed Flyway migration (e.g. V18).
 *
 * Inactive by default. Set the env var DEVSYNC_FLYWAY_REPAIR_ON_START=true,
 * deploy once, then REMOVE the env var. While active, every startup runs
 * flyway.repair() (deletes failed entries from flyway_schema_history and
 * realigns checksums) before flyway.migrate().
 */
@Configuration
@ConditionalOnProperty(name = "devsync.flyway.repair-on-start", havingValue = "true")
public class FlywayRepairConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayRepairConfig.class);

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            log.warn("DEVSYNC_FLYWAY_REPAIR_ON_START is enabled: running Flyway repair before migrate. "
                    + "Remove this env var after one successful start.");
            flyway.repair();
            flyway.migrate();
        };
    }
}