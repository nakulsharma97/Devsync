package com.devsync.billing;

import com.devsync.billing.entity.Plan;
import com.devsync.billing.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Idempotent plan-catalog seeder. The V16 migration seeds the same rows in
 * production; this runner guarantees the catalog exists in test environments
 * (H2 create-drop) and repairs a missing row without ever overwriting an
 * existing plan's configured limits.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PlanSeeder implements CommandLineRunner {

    private final PlanRepository planRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seed("FREE", "Free", "Start collaborating with core project tools.", 0,
                2, 5, 1_073_741_824L, false, "BASIC", false);
        seed("PRO", "Pro", "More private projects, storage and advanced analytics.", 299,
                20, 25, 53_687_091_200L, true, "FULL", true);
        seed("ENTERPRISE", "Enterprise", "Unlimited scale and enterprise controls.", 999,
                null, 100, 268_435_456_000L, true, "ADVANCED", true);
    }

    private void seed(String code, String name, String description, int priceInr,
                      Integer privateProjectLimit, int membersPerProject, long storageBytes,
                      boolean advancedAnalytics, String auditLevel, boolean prioritySupport) {
        if (planRepository.existsById(code)) {
            return; // never overwrite admin-tuned limits
        }
        Instant now = Instant.now();
        planRepository.save(Plan.builder()
                .code(code).name(name).description(description).priceInr(priceInr)
                .currency("INR").privateProjectLimit(privateProjectLimit)
                .membersPerProject(membersPerProject).storageBytes(storageBytes)
                .advancedAnalytics(advancedAnalytics).auditLevel(auditLevel)
                .prioritySupport(prioritySupport).active(true)
                .createdAt(now).updatedAt(now)
                .build());
        log.info("Seeded plan {}", code);
    }
}
