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
 * Razorpay payment flow tests. Covers the full lifecycle: order creation,
 * payment verification, webhook signature validation, activation, duplicate
 * protection, incorrect signature rejection, plan entitlements, expiry, and
 * renewal behavior.
 *
 * <p>Mocked: RazorpayClient API calls. Real: BillingService webhook processing,
 * signature math verified separately in RazorpayClientTest.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RazorpayPaymentTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private PlanService planService;
    @Autowired private AuditLogRepository auditLogRepository;

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
                .email("razorpay@test.dev")
                .username("razorpayuser")
                .fullName("Razorpay Test User")
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .role(User.Role.USER)
                .build();
        userId = userRepository.save(user).getId();
        userToken = "Bearer " + jwtTokenProvider.generateAccessToken(userId, "razorpay@test.dev");

        when(razorpayClient.createOrder(anyLong(), anyString(), anyString()))
                .thenAnswer(inv -> new RazorpayClient.Order(
                        "order_" + System.nanoTime(),
                        inv.getArgument(0), "INR", inv.getArgument(2)));
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(true);
        when(razorpayClient.getKeyId()).thenReturn("rzp_test_key");
    }

    // ── 1. Order creation ──────────────────────────────────────────

    @Test
    void orderCreation_returnsOrderIdAndDetails() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").isNotEmpty())
                .andExpect(jsonPath("$.amountPaise").value(29900))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.keyId").value("rzp_test_key"))
                .andExpect(jsonPath("$.provider").value("RAZORPAY"));

        verify(razorpayClient).createOrder(eq(29900L), eq("INR"), anyString());
    }

    @Test
    void orderCreation_enterpriseCheckout_returnsCorrectAmount() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"ENTERPRISE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amountPaise").value(99900));

        verify(razorpayClient).createOrder(eq(99900L), eq("INR"), anyString());
    }

    // ── 2. Payment verification (webhook activates) ────────────────

    @Test
    void paymentVerification_webhookActivatesSubscription() throws Exception {
        // Create pending payment
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\"}"))
                .andExpect(status().isOk());

        String orderId = paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .get(0).getProviderOrderId();

        // Webhook confirms payment
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_verify_1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", orderId, "pay_verify_1", 29900)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));

        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(userId).get(0);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(payment.getProviderPaymentId()).isEqualTo("pay_verify_1");

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getPlanCode()).isEqualTo("PRO");
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    // ── 3. Webhook signature validation ────────────────────────────

    @Test
    void webhookSignature_validSignature_accepted() throws Exception {
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(true);

        // Create a pending payment so the webhook can be processed
        String orderId = "order_vs";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "valid_sig")
                        .header("X-Razorpay-Event-Id", "evt_valid_sig")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", "order_vs", "pay_vs", 29900)))
                .andExpect(status().isOk());
    }

    @Test
    void webhookSignature_invalidSignature_rejected() throws Exception {
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "bad_sig")
                        .header("X-Razorpay-Event-Id", "evt_bad_sig")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", "order_bs", "pay_bs", 29900)))
                .andExpect(status().isBadRequest());

        assertThat(paymentRepository.count()).isZero();
        assertThat(subscriptionRepository.count()).isZero();
        assertThat(webhookEventRepository.count()).isZero();
    }

    // ── 4. Successful payment activation ────────────────────────────

    @Test
    void successfulPayment_activatesProEntitlements() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\"}"))
                .andExpect(status().isOk());

        String orderId = paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .get(0).getProviderOrderId();

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_activate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", orderId, "pay_activate", 29900)))
                .andExpect(status().isOk());

        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("PRO");
        assertThat(planService.getEffectivePlan(userId).isAdvancedAnalytics()).isTrue();
        assertThat(planService.getEffectivePlan(userId).getPrivateProjectLimit()).isEqualTo(20);
    }

    // ── 5. Duplicate webhook protection ─────────────────────────────

    @Test
    void duplicateWebhook_isIdempotent() throws Exception {
        String orderId = "order_dup_rp";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String body = webhookPayload("payment.captured", orderId, "pay_dup_rp", 29900);

        // First delivery
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_dup_rp")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(false));

        Subscription first = subscriptionRepository.findByUserId(userId).orElseThrow();
        Instant firstEnd = first.getCurrentPeriodEnd();

        // Second delivery — same event id
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_dup_rp")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(true));

        Subscription second = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(second.getCurrentPeriodEnd()).isEqualTo(firstEnd);
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)).hasSize(1);
    }

    // ── 6. Incorrect signature rejection ───────────────────────────

    @Test
    void incorrectSignature_noSideEffects() throws Exception {
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "wrong_sig")
                        .header("X-Razorpay-Event-Id", "evt_wrong")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", "order_wrong", "pay_wrong", 29900)))
                .andExpect(status().isBadRequest());

        assertThat(paymentRepository.count()).isZero();
        assertThat(subscriptionRepository.count()).isZero();
        assertThat(webhookEventRepository.count()).isZero();
        assertThat(auditLogRepository.count()).isZero();
    }

    // ── 7. Plan entitlement assignment ─────────────────────────────

    @Test
    void proPayment_grantsProEntitlements() throws Exception {
        activateViaWebhook("PRO", "evt_ent_pro");

        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("PRO");
        assertThat(planService.getEffectivePlan(userId).getPrivateProjectLimit()).isEqualTo(20);
        assertThat(planService.getEffectivePlan(userId).getStorageBytes()).isEqualTo(53_687_091_200L);
        assertThat(planService.getEffectivePlan(userId).isAdvancedAnalytics()).isTrue();
    }

    @Test
    void enterprisePayment_grantsEnterpriseEntitlements() throws Exception {
        activateViaWebhook("ENTERPRISE", "evt_ent_ent");

        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("ENTERPRISE");
        assertThat(planService.getEffectivePlan(userId).getPrivateProjectLimit()).isNull(); // unlimited
        assertThat(planService.getEffectivePlan(userId).getStorageBytes()).isEqualTo(268_435_456_000L);
        assertThat(planService.getEffectivePlan(userId).getAuditLevel()).isEqualTo("ADVANCED");
    }

    // ── 8. Expiry behavior ─────────────────────────────────────────

    @Test
    void expiredSubscription_revertsToFree() throws Exception {
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().minus(2, ChronoUnit.DAYS)).build());

        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("FREE");
        assertThat(subscriptionRepository.findByUserId(userId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.EXPIRED);
    }

    @Test
    void activeSubscription_notExpired() throws Exception {
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plus(15, ChronoUnit.DAYS)).build());

        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("PRO");
        assertThat(subscriptionRepository.findByUserId(userId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.ACTIVE);
    }

    // ── 9. Renewal behavior ────────────────────────────────────────

    @Test
    void renewal_webhookExtendsPeriod() throws Exception {
        // Set up an existing subscription expiring in 5 days
        Instant periodEnd = Instant.now().plus(5, ChronoUnit.DAYS);
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(periodEnd).build());

        String orderId = "order_renew_rp";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_renew_rp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", orderId, "pay_renew_rp", 29900)))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getCurrentPeriodEnd()).isAfter(periodEnd);
    }

    @Test
    void renewal_detectedByPeriodStartBeforeNow() throws Exception {
        // Subscription activated 10 days ago, expiring in 20 days
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        String orderId = "order_renew_det";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_renew_det")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", orderId, "pay_renew_det", 29900)))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    // ── Helpers ────────────────────────────────────────────────────

    private void activateViaWebhook(String planCode, String eventId) throws Exception {
        String orderId = "order_act_" + planCode;
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode(planCode).providerOrderId(orderId)
                .amountPaise(planCode.equals("PRO") ? 29900 : 99900)
                .currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", eventId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", orderId,
                                "pay_" + eventId, planCode.equals("PRO") ? 29900 : 99900)))
                .andExpect(status().isOk());
    }

    private String webhookPayload(String event, String orderId, String paymentId, long amountPaise) {
        return "{ \"event\": \"" + event + "\", "
                + "\"payload\": { \"payment\": { \"entity\": { \"id\": \"" + paymentId
                + "\", \"order_id\": \"" + orderId + "\", \"amount\": " + amountPaise
                + ", \"currency\": \"INR\", \"status\": \"captured\" } } } }";
    }
}
