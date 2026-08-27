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
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive Stripe recurring subscription tests. Covers the full
 * lifecycle: checkout → activation → renewal → failure → cancellation
 * → deletion → expiry.
 *
 * <p>Mocked: StripeClient (no real API calls), RazorpayClient, EmailService.
 * Real: BillingService webhook processing, database, entitlements.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StripeRecurringSubscriptionTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private PlanRepository planRepository;
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

        User user = User.builder()
                .email("stripe@test.dev")
                .username("stripeuser")
                .fullName("Stripe Test User")
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .role(User.Role.USER)
                .build();
        userId = userRepository.save(user).getId();
        userToken = "Bearer " + jwtTokenProvider.generateAccessToken(userId, "stripe@test.dev");

        // Default Razorpay mocks (for non-Stripe tests that might need it)
        when(razorpayClient.getKeyId()).thenReturn("rzp_test_key");
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(true);
    }

    private void setupStripeSignatureMock() {
        reset(stripeClient);
        when(stripeClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(true);
        // Mock product/price creation for recurring plans (called when stripePriceId is null)
        try {
            doReturn("price_test_mock").when(stripeClient)
                    .createProductAndPrice(anyString(), anyLong(), anyString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String bearer(String id) {
        return "Bearer " + jwtTokenProvider.generateAccessToken(id, id + "@test.dev");
    }

    // ── 1. Recurring Stripe checkout creation ─────────────────────

    @Test
    void recurringCheckout_createsStripeSubscriptionSession() throws Exception {
        setupStripeSignatureMock();
        when(stripeClient.createSubscriptionCheckoutSession(
                anyString(), anyString(), anyString(), any()))
                .thenAnswer(inv -> new StripeClient.CheckoutSession(
                        "cs_recurring_1", "https://checkout.stripe.com/recurring_1"));

        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\",\"provider\":\"STRIPE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("STRIPE"))
                .andExpect(jsonPath("$.checkoutUrl").isNotEmpty());

        verify(stripeClient).createSubscriptionCheckoutSession(
                anyString(), eq("PRO"), eq(userId), any());
    }

    // ── 2. Correct Checkout Session mode ──────────────────────────

    @Test
    void recurringCheckout_usesSubscriptionMode() throws Exception {
        setupStripeSignatureMock();
        when(stripeClient.createSubscriptionCheckoutSession(
                anyString(), anyString(), anyString(), any()))
                .thenAnswer(inv -> new StripeClient.CheckoutSession("cs_mode", "https://stripe.com/mode"));

        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\",\"provider\":\"STRIPE\"}"))
                .andExpect(status().isOk());

        // Verify the subscription checkout was called (not one-time)
        verify(stripeClient).createSubscriptionCheckoutSession(anyString(), anyString(), anyString(), any());
        verify(stripeClient, never()).createCheckoutSession(anyLong(), anyString(), anyString(), anyString());
    }

    // ── 3. Correct plan metadata ──────────────────────────────────

    @Test
    void recurringCheckout_passesPlanCodeAndUserId() throws Exception {
        setupStripeSignatureMock();
        when(stripeClient.createSubscriptionCheckoutSession(
                anyString(), anyString(), anyString(), any()))
                .thenAnswer(inv -> new StripeClient.CheckoutSession("cs_meta", "https://stripe.com/meta"));

        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\",\"provider\":\"STRIPE\"}"))
                .andExpect(status().isOk());

        verify(stripeClient).createSubscriptionCheckoutSession(
                anyString(), eq("PRO"), eq(userId), any());
    }

    // ── 4. checkout.session.completed handling ─────────────────────

    @Test
    void checkoutSessionCompleted_activatesSubscription() throws Exception {
        setupStripeSignatureMock();

        String sessionId = "cs_completed";
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String payload = mapToJson(Map.of(
                "id", "evt_cs_completed",
                "type", "checkout.session.completed",
                "data", Map.of("object", Map.of(
                        "id", sessionId,
                        "payment_intent", "pi_completed",
                        "amount_total", 29900,
                        "currency", "inr",
                        "metadata", Map.of("plan_code", "PRO"),
                        "client_reference_id", userId,
                        "payment_status", "paid"))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));

        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(sessionId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(payment.getProviderPaymentId()).isEqualTo("pi_completed");

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getPlanCode()).isEqualTo("PRO");
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    // ── 5. Stripe subscription association ─────────────────────────

    @Test
    void subscriptionMode_storesStripeSubscriptionId() throws Exception {
        setupStripeSignatureMock();

        String sessionId = "cs_sub_store";
        String stripeSubId = "sub_store_001";
        String stripeCustomerId = "cus_store_001";

        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String payload = mapToJson(Map.of(
                "id", "evt_sub_store",
                "type", "checkout.session.completed",
                "data", Map.of("object", Map.of(
                        "id", sessionId,
                        "payment_intent", "",
                        "subscription", stripeSubId,
                        "customer", stripeCustomerId,
                        "amount_total", 29900,
                        "currency", "inr",
                        "mode", "subscription",
                        "metadata", Map.of("plan_code", "PRO"),
                        "client_reference_id", userId,
                        "payment_status", "paid"))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getProviderSubscriptionId()).isEqualTo(stripeSubId);
        assertThat(sub.getProviderCustomerId()).isEqualTo(stripeCustomerId);
        assertThat(sub.getProvider()).isEqualTo("STRIPE");
    }

    // ── 6. invoice.paid renewal ────────────────────────────────────

    @Test
    void invoicePaid_extendsSubscriptionPeriod() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_renew_inv";

        Instant periodEnd = Instant.now().plus(5, ChronoUnit.DAYS);
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(periodEnd).build());

        long newPeriodStart = Instant.now().plus(5, ChronoUnit.DAYS).getEpochSecond();
        long newPeriodEnd = Instant.now().plus(35, ChronoUnit.DAYS).getEpochSecond();

        String payload = mapToJson(Map.of(
                "id", "evt_inv_renew",
                "type", "invoice.paid",
                "data", Map.of("object", Map.of(
                        "subscription", stripeSubId,
                        "id", "inv_renew",
                        "payment_intent", "pi_inv_renew",
                        "amount_paid", 29900,
                        "currency", "inr",
                        "period_start", newPeriodStart,
                        "period_end", newPeriodEnd))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getCurrentPeriodEnd()).isAfter(periodEnd);

        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(userId).get(0);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
    }

    // ── 7. Subscription period update ──────────────────────────────

    @Test
    void invoicePaid_updatesPeriodStartAndEnd() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_period_update";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        long newStart = Instant.now().plus(5, ChronoUnit.DAYS).getEpochSecond();
        long newEnd = Instant.now().plus(35, ChronoUnit.DAYS).getEpochSecond();

        String payload = mapToJson(Map.of(
                "id", "evt_period_upd",
                "type", "invoice.paid",
                "data", Map.of("object", Map.of(
                        "subscription", stripeSubId,
                        "id", "inv_period_upd",
                        "payment_intent", "pi_period_upd",
                        "amount_paid", 29900,
                        "currency", "inr",
                        "period_start", newStart,
                        "period_end", newEnd))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getCurrentPeriodStart()).isEqualTo(Instant.ofEpochSecond(newStart));
        assertThat(sub.getCurrentPeriodEnd()).isEqualTo(Instant.ofEpochSecond(newEnd));
    }

    // ── 8. Duplicate invoice.paid event ────────────────────────────

    @Test
    void duplicateInvoicePaid_isIdempotent() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_dup_inv";

        Instant periodEnd = Instant.now().plus(5, ChronoUnit.DAYS);
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(periodEnd).build());

        long newStart = Instant.now().plus(5, ChronoUnit.DAYS).getEpochSecond();
        long newEnd = Instant.now().plus(35, ChronoUnit.DAYS).getEpochSecond();

        String payload = mapToJson(Map.of(
                "id", "evt_dup_inv",
                "type", "invoice.paid",
                "data", Map.of("object", Map.of(
                        "subscription", stripeSubId,
                        "id", "inv_dup",
                        "payment_intent", "pi_dup_inv",
                        "amount_paid", 29900,
                        "currency", "inr",
                        "period_start", newStart,
                        "period_end", newEnd))));

        // First delivery
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));

        // Second delivery — same event id → duplicate
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(true));

        // Only one payment recorded
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)).hasSize(1);
    }

    // ── 9. invoice.payment_failed ──────────────────────────────────

    @Test
    void invoicePaymentFailed_setsPastDue() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_inv_fail";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        String payload = mapToJson(Map.of(
                "id", "evt_inv_fail",
                "type", "invoice.payment_failed",
                "data", Map.of("object", Map.of(
                        "subscription", stripeSubId,
                        "id", "invfail_" + stripeSubId,
                        "amount_due", 29900,
                        "currency", "inr"))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
    }

    @Test
    void invoicePaymentFailed_alreadyPastDue_isIdempotent() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_dup_fail";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.PAST_DUE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        String payload = mapToJson(Map.of(
                "id", "evt_dup_fail",
                "type", "invoice.payment_failed",
                "data", Map.of("object", Map.of(
                        "subscription", stripeSubId,
                        "id", "invfail_dup",
                        "amount_due", 29900,
                        "currency", "inr"))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
    }

    // ── 10. customer.subscription.updated ──────────────────────────

    @Test
    void subscriptionUpdated_syncsStatusAndPeriod() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_upd_sync";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        long newPeriodEnd = Instant.now().plus(35, ChronoUnit.DAYS).getEpochSecond();
        String payload = mapToJson(Map.of(
                "id", "evt_sub_upd",
                "type", "customer.subscription.updated",
                "data", Map.of("object", Map.of(
                        "id", stripeSubId,
                        "status", "active",
                        "cancel_at_period_end", true,
                        "current_period_start", newPeriodEnd - 2592000,
                        "current_period_end", newPeriodEnd))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.isCancelAtPeriodEnd()).isTrue();
        assertThat(sub.getCurrentPeriodEnd()).isEqualTo(Instant.ofEpochSecond(newPeriodEnd));
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    @Test
    void subscriptionUpdated_pastDue_syncsStatus() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_upd_past_due";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        long newPeriodEnd = Instant.now().plus(5, ChronoUnit.DAYS).getEpochSecond();
        String payload = mapToJson(Map.of(
                "id", "evt_sub_upd_pd",
                "type", "customer.subscription.updated",
                "data", Map.of("object", Map.of(
                        "id", stripeSubId,
                        "status", "past_due",
                        "cancel_at_period_end", false,
                        "current_period_start", newPeriodEnd - 2592000,
                        "current_period_end", newPeriodEnd))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
    }

    // ── 11. customer.subscription.deleted ──────────────────────────

    @Test
    void subscriptionDeleted_expiresSubscription() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_del_test";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        String payload = mapToJson(Map.of(
                "id", "evt_sub_del",
                "type", "customer.subscription.deleted",
                "data", Map.of("object", Map.of("id", stripeSubId))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
        assertThat(sub.isCancelAtPeriodEnd()).isFalse();

        // Effective plan should be FREE
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("FREE");
    }

    @Test
    void subscriptionDeleted_alreadyExpired_isIdempotent() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_del_dup";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.EXPIRED)
                .currentPeriodEnd(Instant.now().minus(5, ChronoUnit.DAYS)).build());

        String payload = mapToJson(Map.of(
                "id", "evt_sub_del_dup",
                "type", "customer.subscription.deleted",
                "data", Map.of("object", Map.of("id", stripeSubId))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));
    }

    // ── 12. Cancellation at period end ─────────────────────────────

    @Test
    void cancelAtPeriodEnd_keepsAccessUntilExpiry() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_cancel_at";

        doNothing().when(stripeClient).cancelSubscription(anyString());

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        mockMvc.perform(post("/api/billing/cancel")
                        .header("Authorization", userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.isCancelAtPeriodEnd()).isTrue();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);

        verify(stripeClient).cancelSubscription(stripeSubId);
    }

    @Test
    void subscriptionUpdated_cancelAtPeriodEndTrue_syncsFlag() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_cancel_flag";

        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        long periodEnd = Instant.now().plus(20, ChronoUnit.DAYS).getEpochSecond();
        String payload = mapToJson(Map.of(
                "id", "evt_cancel_flag",
                "type", "customer.subscription.updated",
                "data", Map.of("object", Map.of(
                        "id", stripeSubId,
                        "status", "active",
                        "cancel_at_period_end", true,
                        "current_period_start", periodEnd - 2592000,
                        "current_period_end", periodEnd))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(userId).orElseThrow();
        assertThat(sub.isCancelAtPeriodEnd()).isTrue();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    // ── 13. Expiry after the paid period ends ──────────────────────

    @Test
    void expiredSubscription_revertsToFree_onNextLookup() throws Exception {
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().minus(2, ChronoUnit.DAYS)).build());

        // Lazy expiry flips to EXPIRED on next plan lookup
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("FREE");
        assertThat(subscriptionRepository.findByUserId(userId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.EXPIRED);
    }

    @Test
    void pastDueSubscription_notAutoExpired_ifPeriodActive() throws Exception {
        subscriptionRepository.save(Subscription.builder()
                .userId(userId).planCode("PRO").provider("STRIPE")
                .status(SubscriptionStatus.PAST_DUE)
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        // PAST_DUE with active period should still return PRO (grace period)
        assertThat(planService.getEffectivePlan(userId).getCode()).isEqualTo("PRO");
    }

    // ── Utility ───────────────────────────────────────────────────

    private String mapToJson(Map<String, Object> map) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(map);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
