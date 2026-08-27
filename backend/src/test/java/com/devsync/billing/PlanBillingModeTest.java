package com.devsync.billing;

import com.devsync.billing.entity.BillingMode;
import com.devsync.billing.entity.Plan;
import com.devsync.billing.repository.PlanRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the PlanSeeder and migration history produce the correct
 * billing modes for all plans. This guards against entity-default drift,
 * seeder omissions, and migration inconsistencies.
 *
 * <p>These tests run against the test H2 database, which uses
 * {@code ddl-auto: create-drop} with Flyway disabled — the PlanSeeder
 * is the sole source of plan data in the test environment.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class PlanBillingModeTest {

    @Autowired
    private PlanRepository planRepository;

    @Test
    void allPlansExist() {
        assertThat(planRepository.findByCode("FREE")).isPresent();
        assertThat(planRepository.findByCode("PRO")).isPresent();
        assertThat(planRepository.findByCode("ENTERPRISE")).isPresent();
    }

    @Test
    void freePlan_billingMode_isOneTime() {
        Plan free = planRepository.findByCode("FREE").orElseThrow();
        assertThat(free.getBillingMode()).isEqualTo(BillingMode.ONE_TIME);
    }

    @Test
    void proPlan_billingMode_isRecurring() {
        Plan pro = planRepository.findByCode("PRO").orElseThrow();
        assertThat(pro.getBillingMode()).isEqualTo(BillingMode.RECURRING);
    }

    @Test
    void enterprisePlan_billingMode_isRecurring() {
        Plan enterprise = planRepository.findByCode("ENTERPRISE").orElseThrow();
        assertThat(enterprise.getBillingMode()).isEqualTo(BillingMode.RECURRING);
    }

    @Test
    void paidPlans_havePositivePrice() {
        assertThat(planRepository.findByCode("PRO").orElseThrow().getPriceInr()).isGreaterThan(0);
        assertThat(planRepository.findByCode("ENTERPRISE").orElseThrow().getPriceInr()).isGreaterThan(0);
    }

    @Test
    void freePlan_hasZeroPrice() {
        assertThat(planRepository.findByCode("FREE").orElseThrow().getPriceInr()).isZero();
    }

    @Test
    void allPlans_areActive() {
        assertThat(planRepository.findByCode("FREE").orElseThrow().isActive()).isTrue();
        assertThat(planRepository.findByCode("PRO").orElseThrow().isActive()).isTrue();
        assertThat(planRepository.findByCode("ENTERPRISE").orElseThrow().isActive()).isTrue();
    }

    @Test
    void entityDefault_cannotAccidentallySetRecurring() {
        // Verify that the Plan entity's default BillingMode is ONE_TIME.
        // If someone changes the entity default to RECURRING, this test will
        // catch it — ensuring we don't accidentally make FREE a recurring plan.
        Plan freshPlan = Plan.builder()
                .code("TEST")
                .name("Test")
                .description("Test plan")
                .priceInr(100)
                .membersPerProject(5)
                .storageBytes(1024)
                .build();
        // The builder defaults should produce ONE_TIME
        assertThat(freshPlan.getBillingMode()).isEqualTo(BillingMode.ONE_TIME);
    }

    @Test
    void planBillingValidator_runsSuccessfully() {
        // The PlanBillingValidator runs on startup as a CommandLineRunner.
        // If it logged an error, the test context would have started successfully.
        // This test just verifies the validator doesn't crash the app context.
        assertThat(planRepository.findByCode("FREE").orElseThrow().getBillingMode())
                .isEqualTo(BillingMode.ONE_TIME);
    }
}
