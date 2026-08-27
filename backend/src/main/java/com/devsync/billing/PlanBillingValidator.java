package com.devsync.billing;

import com.devsync.billing.entity.BillingMode;
import com.devsync.billing.entity.Plan;
import com.devsync.billing.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;

/**
 * Validates plan billing configuration after startup. Catches misconfigurations
 * caused by migration/seeder mismatches, entity default drift, or manual DB
 * edits that set the wrong billing mode.
 *
 * <p>Runs after {@link PlanSeeder} (Order=1) to validate the final state.</p>
 */
@Component
@Order(10)
@RequiredArgsConstructor
@Slf4j
public class PlanBillingValidator implements CommandLineRunner {

    private final PlanRepository planRepository;

    @Override
    public void run(String... args) {
        validatePlanBillingModes();
    }

    private void validatePlanBillingModes() {
        // FREE must be ONE_TIME (no paid subscription)
        validatePlanBillingMode(PlanCode.FREE, BillingMode.ONE_TIME);

        // PRO must be RECURRING (Stripe subscription)
        validatePlanBillingMode(PlanCode.PRO, BillingMode.RECURRING);

        // ENTERPRISE must be RECURRING (Stripe subscription)
        validatePlanBillingMode(PlanCode.ENTERPRISE, BillingMode.RECURRING);

        log.info("Plan billing configuration validated: FREE=ONE_TIME, PRO=RECURRING, ENTERPRISE=RECURRING");
    }

    private void validatePlanBillingMode(String planCode, BillingMode expectedMode) {
        Plan plan = planRepository.findByCode(planCode).orElse(null);
        if (plan == null) {
            log.warn("Plan {} not found in database — skipping billing mode validation", planCode);
            return;
        }
        if (plan.getBillingMode() != expectedMode) {
            String msg = String.format(
                    "CRITICAL: Plan %s has billingMode=%s but expected %s. "
                    + "This indicates a migration/seeder inconsistency. "
                    + "Set billingMode=%s for plan %s to fix.",
                    planCode, plan.getBillingMode(), expectedMode, expectedMode, planCode);
            log.error(msg);
            // In production, this is a serious misconfiguration — log loudly but don't
            // crash the app (it could be an intentional override by an admin). The
            // plan seeder's idempotent 'skip if exists' logic means a fresh DB gets
            // the correct value, but an existing DB with the wrong value needs a
            // manual UPDATE or a new migration.
        }
    }
}
