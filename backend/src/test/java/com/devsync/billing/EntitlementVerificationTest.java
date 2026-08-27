package com.devsync.billing;

import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.repository.AuditLogRepository;
import com.devsync.billing.entity.*;
import com.devsync.billing.repository.*;
import com.devsync.auth.JwtTokenProvider;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies the complete user benefit flow from entitlement perspective.
 * Tests the backend authorization/entitlement checks that enforce plan
 * restrictions — not just frontend UI.
 *
 * <p>Covers:
 * <ul>
 *   <li>FREE user → free features only</li>
 *   <li>Successful Pro payment → Pro benefits immediately available</li>
 *   <li>Successful Enterprise payment → Enterprise benefits immediately available</li>
 *   <li>Subscription expires → benefits removed → user returns to Free</li>
 *   <li>Failed payment → user does not receive new paid period</li>
 *   <li>Cancelled subscription → access follows cancel-at-period-end policy</li>
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EntitlementVerificationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private PlanService planService;
    @Autowired private EntitlementService entitlementService;

    @MockitoBean private RazorpayClient razorpayClient;
    @MockitoBean private StripeClient stripeClient;
    @MockitoBean private com.devsync.auth.EmailService emailService;

    private String userId;
    private String userToken;

    @BeforeEach
    void setUp() throws Exception {
        webhookEventRepository.deleteAll();
        paymentRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();
        auditLogRepository.deleteAll();

        User user = User.builder()
                .email("entitlement@test.dev")
                .username("entitlementuser")
                .fullName("Entitlement Test User")
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .role(User.Role.USER)
                .build();
        userId = userRepository.save(user).getId();
        userToken = "Bearer " + jwtTokenProvider.generateAccessToken(userId, "entitlement@test.dev");

        when(razorpayClient.createOrder(anyLong(), anyString(), anyString()))
                .thenAnswer(inv -> new RazorpayClient.Order("order_" + System.nanoTime(),
                        inv.getArgument(0), "INR", inv.getArgument(2)));
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(true);
        when(razorpayClient.getKeyId()).thenReturn("rzp_test_key");
    }

    // ── FREE USER → Free features only ────────────────────────────

    @Test
    void freeUser_hasBasicEntitlements() {
        Plan plan = planService.getEffectivePlan(userId);
        assertThat(plan.getCode()).isEqualTo("FREE");
        assertThat(plan.getPriceInr()).isZero();
        assertThat(plan.getPrivateProjectLimit()).isEqualTo(2);
        assertThat(plan.getMembersPerProject()).isEqualTo(5);
        assertThat(plan.getStorageBytes()).isEqualTo(1_073_741_824L);
        assertThat(plan.isAdvancedAnalytics()).isFalse();
        assertThat(plan.isPrioritySupport()).isFalse();
    }

    @Test
    void freeUser_noSubscriptionExists() {
        assertThat(subscriptionRepository.findByUserId(userId)).isEmpty();
    }

    @Test
    void freeUser_cannotUseAdvancedAnalytics() {
        assertThat(entitlementService.canUseAdvancedAnalytics(userId)).isFalse();
    }

    // ── Successful Pro payment → Pro benefits immediately ──────────

    @Test
    void successfulProPayment_proBenefitsImmediatelyAvailable() throws Exception {
        activateViaWebhook("PRO");

        Plan plan = planService.getEffectivePlan(userId);
        assertThat(plan.getCode()).isEqualTo("PRO");
        assertThat(plan.getPrivateProjectLimit()).isEqualTo(20);
        assertThat(plan.getMembersPerProject()).isEqualTo(25);
        assertThat(plan.getStorageBytes()).isEqualTo(53_687_091_200L);
        assertThat(plan.isAdvancedAnalytics()).isTrue();
        assertThat(entitlementService.canUseAdvancedAnalytics(userId)).isTrue();
    }

    @Test
    void successfulProPayment_subscriptionActive() throws Exception {
        activateViaWebhook("PRO");

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getPlanCode()).isEqualTo("PRO");
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getCurrentPeriodEnd()).isAfter(Instant.now());
    }

    // ── Successful Enterprise payment → Enterprise benefits ─────────

    @Test
    void successfulEnterprisePayment_enterpriseBenefitsAvailable() throws Exception {
        activateViaWebhook("ENTERPRISE");

        Plan plan = planService.getEffectivePlan(userId);
        assertThat(plan.getCode()).isEqualTo("ENTERPRISE");
        assertThat(plan.getPrivateProjectLimit()).isNull(); // unlimited
        assertThat(plan.getMembersPerProject()).isEqualTo(100);
        assertThat(plan.getStorageBytes()).isEqualTo(268_435_456_000L);
        assertThat(plan.getAuditLevel()).isEqualTo("ADVANCED");
        assertThat(entitlementService.canUseAdvancedAnalytics(userId)).isTrue();
    }

    @Test
    void successfulEnterprisePayment_subscriptionActive() throws Exception {
        activateViaWebhook("ENTERPRISE");

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getPlanCode()).isEqualTo("ENTERPRISE");
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    // ── Subscription expires → benefits removed ────────────────────

    @Test
    void expiredSubscription_userReturnsToFree() throws Exception {
        activateViaWebhook("PRO");
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("PRO");

        // Expire the subscription
        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        sub.setCurrentPeriodEnd(Instant.now().minus(1, ChronoUnit.DAYS));
        subscriptionRepository.save(sub);

        // Next entitlement lookup triggers lazy expiry
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("FREE");
        assertThat(entitlementService.canUseAdvancedAnalytics(userId)).isFalse();
        assertThat(entitlementService.privateProjectLimit(userId)).isEqualTo(2);
    }

    @Test
    void expiredSubscription_statusBecomesExpired() throws Exception {
        activateViaWebhook("PRO");

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        sub.setCurrentPeriodEnd(Instant.now().minus(5, ChronoUnit.DAYS));
        subscriptionRepository.save(sub);

        planService.getEffectivePlan(userId); // triggers lazy expiry
        assertThat(subscriptionRepository.findByUserId(userId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.EXPIRED);
    }

    @Test
    void expiredSubscription_auditTrailWritten() throws Exception {
        activateViaWebhook("PRO");

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        sub.setCurrentPeriodEnd(Instant.now().minus(1, ChronoUnit.DAYS));
        subscriptionRepository.save(sub);

        planService.getEffectivePlan(userId); // triggers lazy expiry

        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> a.getAction() == AuditAction.SUBSCRIPTION_EXPIRED)).isTrue();
    }

    // ── Failed payment → user does not receive paid period ──────────

    @Test
    void failedPayment_noSubscriptionCreated() throws Exception {
        String orderId = "order_failed";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        // Webhook reports payment failure
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_fail_no_sub")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.failed", orderId, "pay_fail_no_sub", 29900)))
                .andExpect(status().isOk());

        assertThat(subscriptionRepository.findByUserId(userId)).isEmpty();
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("FREE");
    }

    @Test
    void failedPayment_paymentMarkedAsFailed() throws Exception {
        String orderId = "order_fail_status";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_fail_status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.failed", orderId, "pay_fail_status", 29900)))
                .andExpect(status().isOk());

        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(userId).get(0);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
    }

    @Test
    void failedRenewalPayment_setsSubscriptionPastDue() throws Exception {
        // User has an active subscription
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plus(10, ChronoUnit.DAYS)).build());

        String orderId = "order_fail_renew";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_fail_renew")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.failed", orderId, "pay_fail_renew", 29900)))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
    }

    // ── Cancelled subscription → cancel-at-period-end policy ────────

    @Test
    void cancelledSubscription_keepsAccessUntilPeriodEnd() throws Exception {
        activateViaWebhook("PRO");

        Instant periodEnd = Instant.now().plus(20, ChronoUnit.DAYS);
        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        sub.setCurrentPeriodEnd(periodEnd);
        subscriptionRepository.save(sub);

        mockMvc.perform(post("/api/billing/cancel")
                        .header("Authorization", userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true));

        // Still has access
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("PRO");
        assertThat(subscriptionRepository.findByUserId(userId).orElseThrow().isCancelAtPeriodEnd()).isTrue();
        assertThat(subscriptionRepository.findByUserId(userId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.ACTIVE);
    }

    @Test
    void cancelledSubscription_noActiveSubscription_rejected() throws Exception {
        mockMvc.perform(post("/api/billing/cancel")
                        .header("Authorization", userToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cancelledSubscription_freeUser_notAffected() throws Exception {
        // FREE user tries to cancel — should get error
        mockMvc.perform(post("/api/billing/cancel")
                        .header("Authorization", userToken))
                .andExpect(status().isBadRequest());

        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("FREE");
    }

    @Test
    void expiredCancelledSubscription_revertsToFree() throws Exception {
        activateViaWebhook("PRO");

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        sub.setCancelAtPeriodEnd(true);
        sub.setCurrentPeriodEnd(Instant.now().minus(2, ChronoUnit.DAYS));
        subscriptionRepository.save(sub);

        // Lazy expiry flips to EXPIRED
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("FREE");
        assertThat(subscriptionRepository.findByUserId(userId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.EXPIRED);
    }

    // ── Helpers ────────────────────────────────────────────────────

    private void activateViaWebhook(String planCode) throws Exception {
        long amount = planCode.equals("PRO") ? 29900 : 99900;
        String orderId = "order_ent_" + planCode;
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode(planCode).providerOrderId(orderId)
                .amountPaise(amount).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_ent_" + planCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", orderId,
                                "pay_ent_" + planCode, amount)))
                .andExpect(status().isOk());
    }

    private String webhookPayload(String event, String orderId, String paymentId, long amountPaise) {
        return "{ \"event\": \"" + event + "\", "
                + "\"payload\": { \"payment\": { \"entity\": { \"id\": \"" + paymentId
                + "\", \"order_id\": \"" + orderId + "\", \"amount\": " + amountPaise
                + ", \"currency\": \"INR\", \"status\": \"captured\" } } } }";
    }
}
