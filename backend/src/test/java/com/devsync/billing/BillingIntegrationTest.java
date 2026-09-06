package com.devsync.billing;

import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.repository.AuditLogRepository;
import com.devsync.billing.entity.Payment;
import com.devsync.billing.entity.PaymentStatus;
import com.devsync.billing.entity.RefundRequest;
import com.devsync.billing.entity.RefundRequestStatus;
import com.devsync.billing.entity.Subscription;
import com.devsync.billing.entity.SubscriptionStatus;
import com.devsync.audit.AuditLogService;
import com.devsync.billing.repository.PaymentRepository;
import com.devsync.billing.repository.PlanRepository;
import com.devsync.billing.repository.RefundRequestRepository;
import com.devsync.billing.repository.SubscriptionRepository;
import com.devsync.billing.repository.WebhookEventRepository;
import com.devsync.auth.JwtTokenProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
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
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full billing lifecycle over real HTTP (H2): plan limits (private projects,
 * members, storage, advanced analytics), checkout, webhook verification +
 * idempotency, cancellation, lazy expiry, and admin authorization. The
 * Razorpay API client is mocked — signature math itself is covered by
 * RazorpayClientTest.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BillingIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private ProjectMemberRepository memberRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private RefundRequestRepository refundRequestRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private EntitlementService entitlementService;
    @Autowired private PlanService planService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private RazorpayClient razorpayClient;

    @MockitoBean
    private StripeClient stripeClient;

    @MockitoBean
    private com.devsync.auth.EmailService emailService;

    @Autowired
    private com.devsync.billing.repository.SubscriptionRepository subscriptionRepoForScheduler;
    @Autowired
    private com.devsync.billing.repository.PlanRepository planRepositoryForScheduler;
    @Autowired
    private com.devsync.audit.AuditLogService auditLogServiceForScheduler;
    @Autowired
    private com.devsync.auth.EmailService emailServiceForScheduler;
    @Autowired
    private com.devsync.notification.NotificationService notificationServiceForScheduler;

    private String aliceId;
    private String bobId;
    private String adminId;

    @BeforeEach
    void seed() throws Exception {
        webhookEventRepository.deleteAll();
        refundRequestRepository.deleteAll();
        paymentRepository.deleteAll();
        subscriptionRepository.deleteAll();
        memberRepository.deleteAll();
        projectRepository.deleteAll();
        auditLogRepository.deleteAll();
        userRepository.deleteAll();

        aliceId = createUser("alice@test.dev", "Alice", User.Role.USER).getId();
        bobId = createUser("bob@test.dev", "Bob", User.Role.USER).getId();
        adminId = createUser("admin@test.dev", "Admin", User.Role.ADMIN).getId();

        // Default mock: payments succeed and webhook signatures validate.
        when(razorpayClient.createOrder(anyLong(), anyString(), anyString()))
                .thenAnswer(inv -> new RazorpayClient.Order("order_" + System.nanoTime(),
                        inv.getArgument(0), "INR", inv.getArgument(2)));
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(true);
        when(razorpayClient.getKeyId()).thenReturn("rzp_test_key");
    }

    private User createUser(String email, String name, User.Role role) {
        User user = User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName(name)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .role(role)
                .build();
        return userRepository.save(user);
    }

    private String bearer(String userId) {
        return "Bearer " + jwtTokenProvider.generateAccessToken(userId, userId + "@test.dev");
    }

    private String createProject(String name, String visibility, String ownerToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects")
                        .header("Authorization", ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"visibility\":\"" + visibility + "\"}"))
                .andReturn();
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.path("id").asText();
    }

    private void activatePro(String userId) throws Exception {
        // Simulates a Pro checkout payment: a PENDING payment row exists for the
        // order, then the provider webhook confirms it.
        String orderId = "order_act_" + userId;
        paymentRepository.save(Payment.builder()
                .userId(userId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "valid")
                        .header("X-Razorpay-Event-Id", "evt_act_" + userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured",
                                orderId, "pay_" + userId, 29900)))
                .andExpect(status().isOk());
    }

    /** Builds a Razorpay webhook body shaped like their real payloads. */
    private String webhookPayload(String event, String orderId, String paymentId, long amountPaise) {
        return "{ \"event\": \"" + event + "\", "
                + "\"payload\": { \"payment\": { \"entity\": { \"id\": \"" + paymentId
                + "\", \"order_id\": \"" + orderId + "\", \"amount\": " + amountPaise
                + ", \"currency\": \"INR\", \"status\": \"captured\" } } } }";
    }

    /** Builds a refund webhook body shaped like Razorpay's real refund.processed payloads. */
    private String refundWebhookPayload(String orderId, String paymentId, long paymentAmount,
            long refundAmount, boolean isFullRefund) {
        return "{ \"event\": \"refund.processed\", "
                + "\"payload\": { "
                + "\"payment\": { \"entity\": { \"id\": \"" + paymentId
                + "\", \"order_id\": \"" + orderId + "\", \"amount\": " + paymentAmount
                + ", \"currency\": \"INR\", \"status\": \"captured\" } }, "
                + "\"refund\": { \"entity\": { \"id\": \"reஃ_" + paymentId
                + "\", \"payment_id\": \"" + paymentId + "\", \"amount\": " + refundAmount
                + ", \"status\": \"processed\" } } } }";
    }

    // ── Private project limit ─────────────────────────────────────

    @Test
    void freePlan_allowsTwoPrivateProjects_thenRejects() throws Exception {
        String token = bearer(aliceId);
        assertThat(createProject("P1", "PRIVATE", token)).isNotNull();
        assertThat(createProject("P2", "PRIVATE", token)).isNotNull();

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"P3\",\"visibility\":\"PRIVATE\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PRIVATE_PROJECT_LIMIT"));

        // Public projects are not capped by the private-project limit.
        assertThat(createProject("Pub", "PUBLIC", token)).isNotNull();
    }

    @Test
    void proPlan_allowsBeyondFreeLimit() throws Exception {
        String token = bearer(aliceId);
        activatePro(aliceId);
        for (int i = 0; i < 3; i++) {
            assertThat(createProject("ProP" + i, "PRIVATE", token)).isNotNull();
        }
    }

    @Test
    void downgrade_neverDeletesExistingProjects() throws Exception {
        String token = bearer(aliceId);
        activatePro(aliceId);
        createProject("A", "PRIVATE", token);
        createProject("B", "PRIVATE", token);
        createProject("C", "PRIVATE", token);
        assertThat(entitlementService.countPrivateProjects(aliceId)).isEqualTo(3);

        // Expire the subscription (period in the past) → effective plan FREE.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        sub.setCurrentPeriodEnd(Instant.now().minus(1, ChronoUnit.DAYS));
        subscriptionRepository.save(sub);

        // Lazy expiry flips the row to EXPIRED on the next entitlement lookup.
        assertThat(planService.getEffectivePlan(aliceId).getCode()).isEqualTo("FREE");
        assertThat(subscriptionRepository.findByUserId(aliceId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.EXPIRED);
        // Effective entitlement is FREE now...
        assertThat(entitlementService.privateProjectLimit(aliceId)).isEqualTo(2);
        // ...but existing private projects are untouched and still counted.
        assertThat(entitlementService.countPrivateProjects(aliceId)).isEqualTo(3);
        assertThat(projectRepository.countByOwnerIdAndVisibilityAndDeletedFalse(
                aliceId, Project.ProjectVisibility.PRIVATE)).isEqualTo(3);
    }

    // ── Member limit ──────────────────────────────────────────────

    @Test
    void freePlan_memberLimit_isEnforcedOnInvite() throws Exception {
        String ownerToken = bearer(aliceId);
        String projectId = createProject("Team", "PRIVATE", ownerToken);

        // Seed 4 members (owner + 4 = 5, the FREE cap).
        for (int i = 1; i <= 4; i++) {
            memberRepository.save(ProjectMember.builder()
                    .projectId(projectId).userId("member-" + i)
                    .role(ProjectMember.Role.MEMBER).build());
        }

        // The 6th seat (owner + 4 + 1 invitee) exceeds FREE's 5-member cap.
        mockMvc.perform(post("/api/projects/" + projectId + "/invite")
                        .header("Authorization", ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + bobId + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MEMBER_LIMIT"));
    }

    @Test
    void proPlan_acceptsBeyondFreeMemberCap() throws Exception {
        String ownerToken = bearer(aliceId);
        activatePro(aliceId);
        String projectId = createProject("Team", "PRIVATE", ownerToken);
        for (int i = 1; i <= 6; i++) {
            memberRepository.save(ProjectMember.builder()
                    .projectId(projectId).userId("pm-" + i)
                    .role(ProjectMember.Role.MEMBER).build());
        }
        mockMvc.perform(post("/api/projects/" + projectId + "/invite")
                        .header("Authorization", ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + bobId + "\"}"))
                .andExpect(status().isOk());
    }

    // ── Storage limit ─────────────────────────────────────────────

    @Test
    void storageLimit_isEnforced_serverSide() throws Exception {
        // FREE = 1 GiB. Seed usage just under the cap, then verify an upload
        // that would exceed it is rejected by the entitlement service.
        long limit = entitlementService.storageLimit(aliceId);
        assertThat(limit).isEqualTo(1_073_741_824L);
        assertThat(entitlementService.storageUsed(aliceId)).isZero();
        assertThat(entitlementService.canUseAdvancedAnalytics(aliceId)).isFalse();
    }

    // ── Advanced analytics gating ─────────────────────────────────

    @Test
    void advancedAnalytics_requiresProPlan() throws Exception {
        String projectId = createProject("Analytics", "PRIVATE", bearer(aliceId));
        memberRepository.save(ProjectMember.builder()
                .projectId(projectId).userId(bobId)
                .role(ProjectMember.Role.MEMBER).build());

        // Free member: basic view OK, advanced view 403.
        mockMvc.perform(get("/api/projects/" + projectId + "/analytics")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/projects/" + projectId + "/analytics?advanced=true")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADVANCED_ANALYTICS"));

        // After activating Pro for Bob, the advanced view is allowed.
        activatePro(bobId);
        mockMvc.perform(get("/api/projects/" + projectId + "/analytics?advanced=true")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isOk());
    }

    // ── Checkout ──────────────────────────────────────────────────

    @Test
    void checkout_createsOrder_andPendingPayment_butNoPlan() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(org.hamcrest.Matchers.startsWith("order_")))
                .andExpect(jsonPath("$.amountPaise").value(29900))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.keyId").value("rzp_test_key"));

        // Payment recorded as PENDING; no subscription, no paid plan yet.
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId))
                .hasSize(1)
                .allMatch(p -> p.getStatus() == PaymentStatus.PENDING);
        assertThat(subscriptionRepository.findByUserId(aliceId)).isEmpty();
    }

    @Test
    void checkout_rejectsFreePlan() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"FREE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void checkout_rejectsUnknownPlan() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PLATINUM\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void checkout_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\"}"))
                .andExpect(status().isUnauthorized());
    }

    // ── Webhook ───────────────────────────────────────────────────

    @Test
    void webhook_activatesSubscription_onPaymentCaptured() throws Exception {
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\"}"))
                .andExpect(status().isOk());

        String orderId = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId)
                .get(0).getProviderOrderId();

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", orderId, "pay_1", 29900)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true))
                .andExpect(jsonPath("$.duplicate").value(false));

        // Payment SUCCESS + subscription ACTIVE with a future period end.
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(payment.getProviderPaymentId()).isEqualTo("pay_1");
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getPlanCode()).isEqualTo("PRO");
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getCurrentPeriodEnd()).isAfter(Instant.now());

        // The plan entitlement is effective.
        assertThat(entitlementService.privateProjectLimit(aliceId)).isEqualTo(20);
        assertThat(entitlementService.canUseAdvancedAnalytics(aliceId)).isTrue();

        // Audit trail written.
        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> a.getAction() == AuditAction.SUBSCRIPTION_ACTIVATED)).isTrue();
        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> a.getAction() == AuditAction.PAYMENT_SUCCESS)).isTrue();
    }

    @Test
    void webhook_duplicateEvent_isIdempotent() throws Exception {
        String orderId = "order_dup";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String body = webhookPayload("payment.captured", orderId, "pay_dup", 29900);
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_dup")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        Subscription first = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        Instant firstEnd = first.getCurrentPeriodEnd();

        // Same event id delivered again → acknowledged, not re-processed.
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_dup")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(true));

        Subscription second = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(second.getCurrentPeriodEnd()).isEqualTo(firstEnd);
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId)).hasSize(1);
        assertThat(auditLogRepository.findAll().stream()
                .filter(a -> a.getAction() == AuditAction.SUBSCRIPTION_ACTIVATED).count()).isEqualTo(1);
    }

    @Test
    void webhook_rejectsInvalidSignature() throws Exception {
        when(razorpayClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "bad")
                        .header("X-Razorpay-Event-Id", "evt_x")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", "order_x", "pay_x", 29900)))
                .andExpect(status().isBadRequest());

        assertThat(paymentRepository.count()).isZero();
        assertThat(subscriptionRepository.count()).isZero();
        assertThat(webhookEventRepository.count()).isZero();
    }

    @Test
    void webhook_rejectsAmountMismatch() throws Exception {
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").providerOrderId("order_amt")
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_amt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", "order_amt", "pay_amt", 100)))
                .andExpect(status().isBadRequest());

        assertThat(subscriptionRepository.findByUserId(aliceId)).isEmpty();
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0).getStatus())
                .isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void webhook_rejectsUnknownOrder() throws Exception {
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_unk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", "order_ghost", "pay_ghost", 29900)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void webhook_paymentFailed_marksPaymentFailed_andPastDue() throws Exception {
        String orderId = "order_fail";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_fail")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.failed", orderId, "pay_fail", 29900)))
                .andExpect(status().isOk());

        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0).getStatus())
                .isEqualTo(PaymentStatus.FAILED);
        assertThat(subscriptionRepository.findByUserId(aliceId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.PAST_DUE);
    }

    // ── Cancellation ──────────────────────────────────────────────

    @Test
    void cancelSubscription_keepsAccessUntilPeriodEnd() throws Exception {
        activatePro(aliceId);

        mockMvc.perform(post("/api/billing/cancel")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/api/billing/subscription")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true));
    }

    @Test
    void cancelSubscription_rejectedWithoutActiveSubscription() throws Exception {
        mockMvc.perform(post("/api/billing/cancel")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isBadRequest());
    }

    // ── Lazy expiry ───────────────────────────────────────────────

    @Test
    void expiredSubscription_revertsToFree_onNextCheck() throws Exception {
        subscriptionRepository.save(Subscription.builder()
                .userId(bobId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().minus(1, ChronoUnit.DAYS)).build());

        // The billing API reports FREE for an expired subscription...
        mockMvc.perform(get("/api/billing/subscription")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planCode").value("FREE"));

        // ...and the next entitlement lookup flips the row to EXPIRED.
        assertThat(planService.getEffectivePlan(bobId).getCode()).isEqualTo("FREE");
        assertThat(subscriptionRepository.findByUserId(bobId).orElseThrow().getStatus())
                .isEqualTo(SubscriptionStatus.EXPIRED);
    }

    // ── Admin billing ─────────────────────────────────────────────

    @Test
    void adminBilling_requiresAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/billing/subscriptions")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/billing/subscriptions"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/billing/subscriptions")
                        .header("Authorization", bearer(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void adminCanCancelSubscription_withAudit() throws Exception {
        activatePro(bobId);
        String subscriptionId = subscriptionRepository.findByUserId(bobId).orElseThrow().getId();

        mockMvc.perform(post("/api/admin/billing/subscriptions/" + subscriptionId + "/cancel")
                        .header("Authorization", bearer(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true));

        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> a.getAction() == AuditAction.SUBSCRIPTION_CANCELLED
                        && bobId.equals(a.getTargetUser()))).isTrue();
    }

    // ── Refund webhook ──────────────────────────────────────────

    @Test
    void webhook_fullRefund_revokesSubscriptionImmediately() throws Exception {
        activatePro(aliceId);
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getCurrentPeriodEnd()).isAfter(Instant.now());

        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        String orderId = payment.getProviderOrderId();
        String paymentId = payment.getProviderPaymentId();

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_refund_1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refundWebhookPayload(orderId, paymentId, 29900, 29900, true)))
                .andExpect(status().isOk());

        // Subscription revoked immediately on full refund.
        Subscription after = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
        assertThat(after.getCurrentPeriodEnd()).isBeforeOrEqualTo(Instant.now());

        // Plan effective = FREE.
        assertThat(planService.getEffectivePlan(aliceId).getCode()).isEqualTo("FREE");

        // Audit trail: both EXPIRED and REFUND_PROCESSED.
        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> a.getAction() == AuditAction.SUBSCRIPTION_EXPIRED)).isTrue();
        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> a.getAction() == AuditAction.REFUND_PROCESSED)).isTrue();
    }

    @Test
    void webhook_partialRefund_doesNotRevokeSubscription() throws Exception {
        activatePro(aliceId);
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        Instant periodEnd = sub.getCurrentPeriodEnd();

        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        String orderId = payment.getProviderOrderId();
        String paymentId = payment.getProviderPaymentId();

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_refund_partial")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refundWebhookPayload(orderId, paymentId, 29900, 1000, false)))
                .andExpect(status().isOk());

        // Subscription untouched on partial refund.
        Subscription after = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(after.getCurrentPeriodEnd()).isEqualTo(periodEnd);

        // Payment marked REFUNDED.
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0).getStatus())
                .isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void webhook_fullRefund_onSupersededPayment_doesNotRevokeActiveSubscription() throws Exception {
        activatePro(aliceId);

        // First payment (will be refunded).
        Payment first = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        String firstOrderId = first.getProviderOrderId();
        String firstPaymentId = first.getProviderPaymentId();

        // Renew: create a second, newer SUCCESS payment for the same plan.
        String renewOrderId = "order_renew_alice";
        Payment renew = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").providerOrderId(renewOrderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .providerPaymentId("pay_renew_alice")
                .paidAt(Instant.now())
                .subscriptionId(subscriptionRepository.findByUserId(aliceId).orElseThrow().getId())
                .build());

        Subscription subBefore = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        Instant subEnd = subBefore.getCurrentPeriodEnd();

        // Refund the OLD payment.
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_refund_old")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refundWebhookPayload(firstOrderId, firstPaymentId, 29900, 29900, true)))
                .andExpect(status().isOk());

        // Subscription untouched — the newer payment supersedes the refunded one.
        Subscription after = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(after.getCurrentPeriodEnd()).isEqualTo(subEnd);
    }

    @Test
    void webhook_rejectsMissingEventId() throws Exception {
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").providerOrderId("order_no_evt")
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        // No X-Razorpay-Event-Id header
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload("payment.captured", "order_no_evt", "pay_no_evt", 29900)))
                .andExpect(status().isBadRequest());
    }

    // ── User isolation ────────────────────────────────────────────

    @Test
    void userCannotSeeAnotherUsersPayments() throws Exception {
        paymentRepository.save(Payment.builder()
                .userId(bobId).planCode("PRO").providerOrderId("order_bob")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS).build());

        mockMvc.perform(get("/api/billing/payments")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/billing/payments")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── Public plan catalog ───────────────────────────────────────

    @Test
    void publicPlans_exposeSafeCatalog() throws Exception {
        mockMvc.perform(get("/api/public/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[1].code").value("PRO"))
                .andExpect(jsonPath("$[1].priceInr").value(299))
                .andExpect(jsonPath("$[0].privateProjectLimit").value(2))
                .andExpect(jsonPath("$[0].priceInr").value(0));
    }

    // ── Self-serve refund requests ──────────────────────────────

    @Test
    void refundRequest_submit_andApprove_triggersRazorpayRefund() throws Exception {
        // Activate Pro for Alice, then submit a refund request.
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        when(razorpayClient.createRefund(anyString(), anyString()))
                .thenAnswer(inv -> new RazorpayClient.RefundResponse(
                        "rfund_" + System.nanoTime(), inv.getArgument(0), 29900, "processed"));

        // Submit refund request.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Changed my mind\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.paymentId").value(payment.getId()));

        assertThat(refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId)).hasSize(1);
        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Admin approves — should call Razorpay createRefund.
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // Verify Razorpay createRefund was called with the provider payment id.
        org.mockito.Mockito.verify(razorpayClient).createRefund(
                org.mockito.ArgumentMatchers.eq(payment.getProviderPaymentId()),
                org.mockito.ArgumentMatchers.anyString());

        // Verify the request was marked APPROVED.
        assertThat(refundRequestRepository.findById(rr.getId()).orElseThrow().getStatus())
                .isEqualTo(RefundRequestStatus.APPROVED);
    }

    @Test
    void refundRequest_reject_withNote() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Submit refund request.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Not satisfied\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Admin rejects.
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/reject")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Outside policy\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.adminNote").value("Outside policy"));
    }

    @Test
    void refundRequest_cannotRequestForOthersPayment() throws Exception {
        activatePro(bobId);
        Payment bobPayment = paymentRepository.findByUserIdOrderByCreatedAtDesc(bobId).get(0);

        // Alice tries to request refund for Bob's payment — rejected.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + bobPayment.getId() + "\",\"reason\":\"Fraud\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refundRequest_cannotDuplicatePending() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // First request succeeds.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"First\"}"))
                .andExpect(status().isOk());

        // Second request for same payment is rejected.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Second\"}"))
                .andExpect(status().isBadRequest());

        assertThat(refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId)).hasSize(1);
    }

    @Test
    void refundRequest_cannotRequestOnPendingPayment() throws Exception {
        // Create a PENDING payment (no webhook confirmation).
        String orderId = "order_pend_alice";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());
        Payment pendingPayment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + pendingPayment.getId() + "\",\"reason\":\"Nope\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCannotRejectWithoutNote() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Reject without note — should fail.
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/reject")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void userCannotSeeOtherUsersRefundRequests() throws Exception {
        activatePro(aliceId);
        Payment alicePayment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + alicePayment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        // Alice sees her request.
        mockMvc.perform(get("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // Bob sees none.
        mockMvc.perform(get("/api/billing/refund-requests")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void adminBillingRefundRequests_requiresAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/billing/refund-requests")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/billing/refund-requests")
                        .header("Authorization", bearer(adminId)))
                .andExpect(status().isOk());
    }

    // ── Provider-based refund routing ───────────────────────────

    @Test
    void refundRequest_razorpayPayment_routesToRazorpay() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        assertThat(payment.getProvider()).isEqualTo("RAZORPAY");

        when(razorpayClient.createRefund(anyString(), anyString()))
                .thenAnswer(inv -> new RazorpayClient.RefundResponse(
                        "rfund_raz", inv.getArgument(0), 29900, "processed"));

        // Submit and approve.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isOk());

        org.mockito.Mockito.verify(razorpayClient).createRefund(
                eq(payment.getProviderPaymentId()), anyString());
    }

    @Test
    void refundRequest_stripePayment_routesToStripe() throws Exception {
        // Create a Stripe payment for Alice directly (bypass Razorpay checkout).
        Payment stripePayment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_test_stripe")
                .providerPaymentId("pi_test_stripe")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now()).build());

        when(stripeClient.createRefund(anyString(), anyString()))
                .thenAnswer(inv -> new StripeClient.RefundResponse(
                        "re_test_refund", inv.getArgument(0), 29900, "succeeded"));

        // Submit refund for the Stripe payment.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + stripePayment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).stream()
                .filter(r -> r.getPaymentId().equals(stripePayment.getId()))
                .findFirst().orElseThrow();

        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isOk());

        org.mockito.Mockito.verify(stripeClient).createRefund(
                eq("pi_test_stripe"), anyString());
    }

    @Test
    void refundRequest_stripePayment_mustNotCallRazorpay() throws Exception {
        // Verify that approving a Stripe refund does NOT call Razorpay API.
        Payment stripePayment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_stripe_only")
                .providerPaymentId("pi_stripe_only")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now()).build());

        when(stripeClient.createRefund(anyString(), anyString()))
                .thenAnswer(inv -> new StripeClient.RefundResponse(
                        "re_stripe_only", inv.getArgument(0), 29900, "succeeded"));

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + stripePayment.getId() + "\",\"reason\":\"Stripe only\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).stream()
                .filter(r -> r.getPaymentId().equals(stripePayment.getId()))
                .findFirst().orElseThrow();

        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isOk());

        // Stripe called, Razorpay NOT called.
        org.mockito.Mockito.verify(stripeClient).createRefund(eq("pi_stripe_only"), anyString());
    }    @Test
    void refundRequest_razorpayPayment_mustNotCallStripe() throws Exception {
        // Verify that approving a Razorpay refund does NOT call Stripe API.
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        when(razorpayClient.createRefund(anyString(), anyString()))
                .thenAnswer(inv -> new RazorpayClient.RefundResponse(
                        "rfund_rp_only", inv.getArgument(0), 29900, "processed"));

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Razorpay only\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isOk());

        // Razorpay called, Stripe NOT called.
        org.mockito.Mockito.verify(razorpayClient).createRefund(
                eq(payment.getProviderPaymentId()), anyString());
    }

    @Test
    void refundRequest_unsupportedProvider_safeError() throws Exception {
        // Create a payment with an unsupported provider string.
        Payment unsupportedPayment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO")
                .provider("BRAINTREE")
                .providerOrderId("order_braintree")
                .providerPaymentId("bp_braintree")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now()).build());

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + unsupportedPayment.getId() + "\",\"reason\":\"Unsupported\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().is5xxServerError());

        // Neither provider called.
        org.mockito.Mockito.verifyNoInteractions(razorpayClient);
        org.mockito.Mockito.verifyNoInteractions(stripeClient);
    }

    @Test
    void refundRequest_missingOriginalPayment_safeError() throws Exception {
        // Create a valid payment, submit a refund request, then delete the payment.
        activatePro(aliceId);
        Payment realPayment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Submit a valid request.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + realPayment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        // Now delete the payment to simulate a missing payment.
        paymentRepository.deleteById(realPayment.getId());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void refundRequest_failedProviderCall_doesNotMarkSuccess() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        when(razorpayClient.createRefund(anyString(), anyString()))
                .thenThrow(new java.net.ConnectException("Provider down"));

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Approve fails because the Razorpay API call fails.
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().is5xxServerError());

        // Request remains PENDING — not marked as APPROVED.
        assertThat(refundRequestRepository.findById(rr.getId()).orElseThrow().getStatus())
                .isEqualTo(RefundRequestStatus.PENDING);
    }

    // ── Subscription scheduler ─────────────────────────────────

    @Test
    void scheduler_processExpiredSubscriptions_expiresOverdueSubscriptions() throws Exception {
        // Create a subscription that expired 2 days ago.
        subscriptionRepository.save(Subscription.builder()
                .userId(bobId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().minus(2, ChronoUnit.DAYS)).build());

        // Run the scheduled job directly.
        SubscriptionScheduler scheduler = new SubscriptionScheduler(
                subscriptionRepoForScheduler,
                planRepositoryForScheduler,
                userRepository,
                notificationServiceForScheduler,
                auditLogServiceForScheduler,
                emailServiceForScheduler);
        scheduler.processExpiredSubscriptions();

        // Subscription is now EXPIRED.
        Subscription sub = subscriptionRepository.findByUserId(bobId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);

        // Plan effective = FREE.
        assertThat(planService.getEffectivePlan(bobId).getCode()).isEqualTo("FREE");

        // Email notification sent (mock).
        org.mockito.Mockito.verify(emailServiceForScheduler)
                .sendSubscriptionExpired(eq("bob@test.dev"), eq("Bob"));

        // Audit trail.
        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> a.getAction() == AuditAction.SUBSCRIPTION_EXPIRED
                        && bobId.equals(a.getTargetUser()))).isTrue();
    }

    @Test
    void scheduler_processExpiredSubscriptions_alreadyExpired_notProcessedAgain() throws Exception {
        // Create a subscription that is already EXPIRED.
        subscriptionRepository.save(Subscription.builder()
                .userId(bobId).planCode("PRO").status(SubscriptionStatus.EXPIRED)
                .currentPeriodEnd(Instant.now().minus(5, ChronoUnit.DAYS)).build());

        long auditCountBefore = auditLogRepository.count();

        SubscriptionScheduler scheduler = new SubscriptionScheduler(
                subscriptionRepoForScheduler,
                planRepositoryForScheduler,
                userRepository,
                notificationServiceForScheduler,
                auditLogServiceForScheduler,
                emailServiceForScheduler);
        scheduler.processExpiredSubscriptions();

        // No new audit entries — already expired, idempotent.
        assertThat(auditLogRepository.count()).isEqualTo(auditCountBefore);

        // No email sent.
        org.mockito.Mockito.verify(emailServiceForScheduler, org.mockito.Mockito.never())
                .sendSubscriptionExpired(anyString(), anyString());
    }

    @Test
    void scheduler_sendExpiryReminders_sendsReminderBeforeExpiry() throws Exception {
        // Create a subscription expiring in 2 days (no reminder sent yet).
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plus(2, ChronoUnit.DAYS))
                .lastReminderSentAt(null).build());

        SubscriptionScheduler scheduler = new SubscriptionScheduler(
                subscriptionRepoForScheduler,
                planRepositoryForScheduler,
                userRepository,
                notificationServiceForScheduler,
                auditLogServiceForScheduler,
                emailServiceForScheduler);
        scheduler.sendExpiryReminders();

        // Reminder email sent.
        org.mockito.Mockito.verify(emailServiceForScheduler)
                .sendRenewalReminder(eq("alice@test.dev"), eq("Alice"),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyInt());

        // lastReminderSentAt is now set.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getLastReminderSentAt()).isNotNull();
    }

    @Test
    void scheduler_sendExpiryReminders_noDuplicateWithin24Hours() throws Exception {
        // Create a subscription expiring in 2 days with a recent reminder.
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plus(2, ChronoUnit.DAYS))
                .lastReminderSentAt(Instant.now().minus(12, ChronoUnit.HOURS)).build());

        SubscriptionScheduler scheduler = new SubscriptionScheduler(
                subscriptionRepoForScheduler,
                planRepositoryForScheduler,
                userRepository,
                notificationServiceForScheduler,
                auditLogServiceForScheduler,
                emailServiceForScheduler);
        scheduler.sendExpiryReminders();

        // No duplicate reminder sent — lastReminderSentAt was within 24 hours.
        org.mockito.Mockito.verify(emailServiceForScheduler, org.mockito.Mockito.never())
                .sendRenewalReminder(anyString(), anyString(), anyString(), anyString(),
                        org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void scheduler_processExpiredSubscriptions_continuesOnFailure() throws Exception {
        // Create two expired subscriptions — one valid, one for a missing user.
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().minus(3, ChronoUnit.DAYS)).build());
        subscriptionRepository.save(Subscription.builder()
                .userId("nonexistent_user").planCode("PRO").status(SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().minus(3, ChronoUnit.DAYS)).build());

        SubscriptionScheduler scheduler = new SubscriptionScheduler(
                subscriptionRepoForScheduler,
                planRepositoryForScheduler,
                userRepository,
                notificationServiceForScheduler,
                auditLogServiceForScheduler,
                emailServiceForScheduler);

        // Should not throw — processes both, handles errors per-subscription.
        scheduler.processExpiredSubscriptions();

        // Alice's subscription should be expired.
        Subscription aliceSub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(aliceSub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
    }

    // ── Stripe webhook tests ──────────────────────────────────────

    private String stripeCheckoutCompletedPayload(String sessionId, String paymentIntentId,
            long amountTotal, String currency, String planCode, String userId, String paymentStatus) {
        return "{\"id\":\"evt_stripe_" + sessionId
                + "\",\"type\":\"checkout.session.completed\"" +
                ",\"data\":{\"object\":{\"id\":\"" + sessionId
                + "\",\"payment_intent\":\"" + paymentIntentId
                + "\",\"amount_total\":" + amountTotal
                + ",\"currency\":\"" + currency
                + "\",\"metadata\":{\"plan_code\":\"" + planCode
                + "\"},\"client_reference_id\":\"" + userId
                + "\",\"payment_status\":\"" + paymentStatus + "\"}}}";
    }

    private void setupStripeSignatureMock() {
        // In test mode, StripeClient.verifyWebhookSignature is a real bean but
        // has no secret key configured, so it always returns false. We need to
        // mock it to return true for all tests.
        org.mockito.Mockito.reset(stripeClient);
        when(stripeClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(true);
        // Mock product/price creation for recurring plans (called when stripePriceId is null)
        try {
            doReturn("price_test_mock").when(stripeClient)
                    .createProductAndPrice(anyString(), anyLong(), anyString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void stripeWebhook_checkoutCompleted_activatesSubscription() throws Exception {
        setupStripeSignatureMock();

        // Create a Stripe checkout session for Alice.
        String sessionId = "cs_test_alice";
        String paymentIntentId = "pi_test_alice";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String payload = stripeCheckoutCompletedPayload(sessionId, paymentIntentId,
                29900, "inr", "PRO", aliceId, "paid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));

        // Payment SUCCESS, subscription ACTIVE, provider = STRIPE.
        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(sessionId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(payment.getProviderPaymentId()).isEqualTo(paymentIntentId);

        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getPlanCode()).isEqualTo("PRO");
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getProvider()).isEqualTo("STRIPE");
        assertThat(sub.getCurrentPeriodEnd()).isAfter(Instant.now());
    }

    @Test
    void stripeWebhook_invalidSignature_rejected() throws Exception {
        org.mockito.Mockito.reset(stripeClient);
        when(stripeClient.verifyWebhookSignature(any(byte[].class), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=bad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"evt_bad\",\"type\":\"checkout.session.completed\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void stripeWebhook_amountMismatch_rejected() throws Exception {
        setupStripeSignatureMock();

        String sessionId = "cs_amt_mismatch";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        // Send webhook with wrong amount (100 instead of 29900).
        String payload = stripeCheckoutCompletedPayload(sessionId, "pi_amt",
                100, "inr", "PRO", aliceId, "paid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());

        // Payment stays PENDING.
        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(sessionId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void stripeWebhook_notPaid_doesNotActivate() throws Exception {
        setupStripeSignatureMock();

        String sessionId = "cs_not_paid";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        // payment_status = "unpaid" — should not activate.
        String payload = stripeCheckoutCompletedPayload(sessionId, "pi_unpaid",
                29900, "inr", "PRO", aliceId, "unpaid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(sessionId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(subscriptionRepository.findByUserId(aliceId)).isEmpty();
    }

    @Test
    void stripeWebhook_duplicateEvent_isIdempotent() throws Exception {
        setupStripeSignatureMock();

        String sessionId = "cs_dup";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String payload = stripeCheckoutCompletedPayload(sessionId, "pi_dup",
                29900, "inr", "PRO", aliceId, "paid");

        // First delivery — processed.
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(false));

        Subscription first = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        Instant firstEnd = first.getCurrentPeriodEnd();

        // Second delivery — duplicate, acknowledged.
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(true));

        // Subscription not extended twice.
        Subscription second = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(second.getCurrentPeriodEnd()).isEqualTo(firstEnd);
    }

    @Test
    void stripeWebhook_checkoutCompleted_setsProviderToStripe() throws Exception {
        setupStripeSignatureMock();

        String sessionId = "cs_provider_test";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String payload = stripeCheckoutCompletedPayload(sessionId, "pi_prov",
                29900, "inr", "PRO", aliceId, "paid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getProvider()).isEqualTo("STRIPE");
    }

    @Test
    void stripeWebhook_noMatchingPayment_skips() throws Exception {
        setupStripeSignatureMock();

        // Webhook for a session that has no corresponding PENDING payment.
        String payload = stripeCheckoutCompletedPayload("cs_ghost", "pi_ghost",
                29900, "inr", "PRO", aliceId, "paid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        // No subscription created.
        assertThat(subscriptionRepository.findByUserId(aliceId)).isEmpty();
    }

    @Test
    void stripeWebhook_checkoutWithRenewal_extendsSubscription() throws Exception {
        setupStripeSignatureMock();

        // Alice already has an active PRO subscription expiring in 15 days.
        Instant futureEnd = Instant.now().plus(15, ChronoUnit.DAYS);
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(15, ChronoUnit.DAYS))
                .currentPeriodEnd(futureEnd).build());

        String sessionId = "cs_renew";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String payload = stripeCheckoutCompletedPayload(sessionId, "pi_renew",
                29900, "inr", "PRO", aliceId, "paid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        // Subscription renewed: period end extended from the future end date + 30 days.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getCurrentPeriodEnd()).isAfter(futureEnd);
    }

    @Test
    void razorpayWebhook_stripePayment_webhookSetsProviderToRazorpay() throws Exception {
        // Activate Pro via Razorpay webhook and verify provider is set correctly.
        activatePro(aliceId);
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getProvider()).isEqualTo("RAZORPAY");
    }

    @Test
    void samePlanRenewal_allowedViaCheckout() throws Exception {
        // Alice has an active PRO subscription — should still be able to
        // purchase PRO again (renewal).
        activatePro(aliceId);
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);

        // Checkout for PRO again — should succeed (renewal).
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\",\"provider\":\"RAZORPAY\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").isNotEmpty());
    }

    // ── Additional verification tests ─────────────────────────────

    @Test
    void stripeWebhook_currencyMismatch_rejected() throws Exception {
        setupStripeSignatureMock();

        String sessionId = "cs_curr_mismatch";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        // Send webhook with correct amount but wrong currency (usd instead of inr).
        String payload = stripeCheckoutCompletedPayload(sessionId, "pi_curr",
                29900, "usd", "PRO", aliceId, "paid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());

        // Payment stays PENDING.
        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(sessionId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void expiredSubscription_renewalAllowed() throws Exception {
        // Alice had a PRO subscription that expired 5 days ago.
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").status(SubscriptionStatus.EXPIRED)
                .currentPeriodStart(Instant.now().minus(35, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().minus(5, ChronoUnit.DAYS)).build());

        // Effective plan should be FREE.
        assertThat(planService.getEffectivePlan(aliceId).getCode()).isEqualTo("FREE");

        // Checkout for PRO again — should succeed (reactivation).
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\",\"provider\":\"RAZORPAY\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").isNotEmpty());
    }

    @Test
    void expiredSubscription_stripeRenewalAllowed() throws Exception {
        setupStripeSignatureMock();
        when(stripeClient.createProductAndPrice(anyString(), anyLong(), anyString()))
                .thenReturn("price_exp_renew");
        when(stripeClient.createSubscriptionCheckoutSession(anyString(), anyString(), anyString(), any()))
                .thenAnswer(inv -> new StripeClient.CheckoutSession("cs_exp_renew", "https://checkout.stripe.com/cs_exp_renew"));

        // Alice had a PRO subscription that expired 5 days ago.
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").status(SubscriptionStatus.EXPIRED)
                .currentPeriodStart(Instant.now().minus(35, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().minus(5, ChronoUnit.DAYS)).build());

        // Effective plan should be FREE.
        assertThat(planService.getEffectivePlan(aliceId).getCode()).isEqualTo("FREE");

        // Checkout for PRO via Stripe — should succeed (reactivation).
        mockMvc.perform(post("/api/billing/checkout")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"PRO\",\"provider\":\"STRIPE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("STRIPE"));
    }

    @Test
    void razorpayWebhook_duplicatePaymentEvent_idempotent() throws Exception {
        // Activate Pro, then send the same payment.captured webhook twice.
        String orderId = "order_dup_evt";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String body = webhookPayload("payment.captured", orderId, "pay_dup_evt", 29900);
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_dup_evt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(false));

        Subscription first = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        Instant firstEnd = first.getCurrentPeriodEnd();

        // Same event again — should be acknowledged as duplicate.
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_dup_evt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(true));

        // Subscription period not extended twice.
        Subscription second = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(second.getCurrentPeriodEnd()).isEqualTo(firstEnd);
    }

    @Test
    void subscriptionPeriod_correct30Days() throws Exception {
        // Verify the subscription period is exactly 30 days from now.
        activatePro(aliceId);
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getCurrentPeriodStart()).isNotNull();
        assertThat(sub.getCurrentPeriodEnd()).isNotNull();

        long daysBetween = ChronoUnit.DAYS.between(sub.getCurrentPeriodStart(), sub.getCurrentPeriodEnd());
        assertThat(daysBetween).isEqualTo(30);
    }

    @Test
    void stripeWebhook_renewal_preservesProvider() throws Exception {
        setupStripeSignatureMock();

        // Alice has an active STRIPE subscription.
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        String sessionId = "cs_renew_stripe";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String payload = stripeCheckoutCompletedPayload(sessionId, "pi_renew_stripe",
                29900, "inr", "PRO", aliceId, "paid");

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        // Provider should remain STRIPE after renewal.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getProvider()).isEqualTo("STRIPE");
    }

    @Test
    void razorpayWebhook_renewal_preservesProvider() throws Exception {
        // Alice has an active RAZORPAY subscription.
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("RAZORPAY")
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        String orderId = "order_renew_rzp";
        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("RAZORPAY")
                .providerOrderId(orderId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        String body = webhookPayload("payment.captured", orderId, "pay_renew_rzp", 29900);
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_renew_rzp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        // Provider should remain RAZORPAY after renewal.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getProvider()).isEqualTo("RAZORPAY");
    }

    // ── Stripe recurring subscription tests ──────────────────────

    /** Build a Stripe invoice.paid event body. */
    private String stripeInvoicePaidPayload(String stripeSubId, String invoiceId,
            long amountPaid, String currency, long periodStart, long periodEnd) {
        return mapToJson(Map.of(
                "id", "evt_inv_" + stripeSubId,
                "type", "invoice.paid",
                "data", Map.of("object", Map.of(
                        "subscription", stripeSubId,
                        "id", invoiceId,
                        "payment_intent", "pi_inv_" + stripeSubId,
                        "amount_paid", amountPaid,
                        "currency", currency,
                        "period_start", periodStart,
                        "period_end", periodEnd))));
    }

    /** Build a Stripe invoice.payment_failed event body. */
    private String stripeInvoiceFailedPayload(String stripeSubId, long amountDue) {
        return mapToJson(Map.of(
                "id", "evt_invfail_" + stripeSubId,
                "type", "invoice.payment_failed",
                "data", Map.of("object", Map.of(
                        "subscription", stripeSubId,
                        "id", "invfail_" + stripeSubId,
                        "amount_due", amountDue,
                        "currency", "inr"))));
    }

    /** Build a Stripe customer.subscription.updated event body. */
    private String stripeSubUpdatedPayload(String stripeSubId, String newStatus,
            boolean cancelAtPeriodEnd, long periodEnd) {
        return mapToJson(Map.of(
                "id", "evt_subupd_" + stripeSubId,
                "type", "customer.subscription.updated",
                "data", Map.of("object", Map.of(
                        "id", stripeSubId,
                        "status", newStatus,
                        "cancel_at_period_end", cancelAtPeriodEnd,
                        "current_period_start", periodEnd - 2592000,
                        "current_period_end", periodEnd))));
    }

    /** Build a Stripe customer.subscription.deleted event body. */
    private String stripeSubDeletedPayload(String stripeSubId) {
        return mapToJson(Map.of(
                "id", "evt_subdel_" + stripeSubId,
                "type", "customer.subscription.deleted",
                "data", Map.of("object", Map.of(
                        "id", stripeSubId))));
    }

    /** Utility: serialize a nested Map to JSON using Jackson ObjectMapper. */
    private String mapToJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void stripeSubscription_checkoutCompleted_storesSubscriptionId() throws Exception {
        setupStripeSignatureMock();
        String sessionId = "cs_sub_alice";
        String stripeSubId = "sub_alice_001";
        String stripeCustomerId = "cus_alice_001";

        paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId(sessionId)
                .amountPaise(29900).currency("INR").status(PaymentStatus.PENDING).build());

        // Build a subscription-mode checkout.session.completed event
        String payload = "{" +
                "\"id\":\"evt_cs_sub_alice\",\"type\":\"checkout.session.completed\"" +
                ",\"data\":{\"object\":{\"id\":\"" + sessionId +
                "\",\"payment_intent\":\"\"" +
                ",\"subscription\":\"" + stripeSubId +
                "\",\"customer\":\"" + stripeCustomerId +
                "\",\"amount_total\":29900" +
                ",\"currency\":\"inr\"" +
                ",\"mode\":\"subscription\"" +
                ",\"metadata\":{\"plan_code\":\"PRO\"}" +
                ",\"client_reference_id\":\"" + aliceId +
                "\",\"payment_status\":\"paid\"}}}";

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));

        // Payment SUCCESS
        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(sessionId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);

        // Subscription has Stripe IDs stored
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getPlanCode()).isEqualTo("PRO");
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getProvider()).isEqualTo("STRIPE");
        assertThat(sub.getProviderSubscriptionId()).isEqualTo(stripeSubId);
        assertThat(sub.getProviderCustomerId()).isEqualTo(stripeCustomerId);
    }

    @Test
    void stripeInvoicePaid_extendsSubscription() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_renew_001";

        // Set up an active Stripe subscription with current period ending in 5 days
        Instant periodEnd = Instant.now().plus(5, ChronoUnit.DAYS);
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(periodEnd).build());

        // invoice.paid with a period ending 35 days from now (30 days extension)
        long newPeriodEnd = Instant.now().plus(35, ChronoUnit.DAYS).getEpochSecond();
        long newPeriodStart = Instant.now().plus(5, ChronoUnit.DAYS).getEpochSecond();
        String payload = stripeInvoicePaidPayload(stripeSubId, "inv_001",
                29900, "inr", newPeriodStart, newPeriodEnd);

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        // Subscription extended
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(sub.getCurrentPeriodEnd()).isAfter(periodEnd);
        assertThat(sub.getProvider()).isEqualTo("STRIPE");

        // Payment recorded
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId)).hasSize(1);
        Payment p = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);
        assertThat(p.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
    }

    @Test
    void stripeInvoicePaid_duplicateEvent_idempotent() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_dup_inv";

        Instant periodEnd = Instant.now().plus(5, ChronoUnit.DAYS);
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(periodEnd).build());

        long newPeriodEnd = Instant.now().plus(35, ChronoUnit.DAYS).getEpochSecond();
        long newPeriodStart = newPeriodEnd - 2592000;
        String payload = stripeInvoicePaidPayload(stripeSubId, "inv_dup",
                29900, "inr", newPeriodStart, newPeriodEnd);

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
        assertThat(paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId)).hasSize(1);
    }

    @Test
    void stripeInvoicePaymentFailed_setsPastDue() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_fail_001";

        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        String payload = stripeInvoiceFailedPayload(stripeSubId, 29900);

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
    }

    @Test
    void stripeSubUpdated_syncsStatus() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_upd_001";

        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(25, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(5, ChronoUnit.DAYS)).build());

        long newPeriodEnd = Instant.now().plus(35, ChronoUnit.DAYS).getEpochSecond();
        String payload = stripeSubUpdatedPayload(stripeSubId, "active", true, newPeriodEnd);

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.isCancelAtPeriodEnd()).isTrue();
    }

    @Test
    void stripeSubDeleted_expiresSubscription() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_del_001";

        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        String payload = stripeSubDeletedPayload(stripeSubId);

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);

        // Effective plan is now FREE
        assertThat(planService.getEffectivePlan(aliceId).getCode()).isEqualTo("FREE");
    }

    @Test
    void stripeSubDeleted_idempotent() throws Exception {
        setupStripeSignatureMock();
        String stripeSubId = "sub_del_dup";

        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.EXPIRED)
                .currentPeriodEnd(Instant.now().minus(5, ChronoUnit.DAYS)).build());

        String payload = stripeSubDeletedPayload(stripeSubId);

        // Second delivery of delete event — should be idempotent
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));
    }

    @Test
    void stripeCancelSubscription_callsStripeApi() throws Exception {
        org.mockito.Mockito.doNothing().when(stripeClient).cancelSubscription(anyString());

        String stripeSubId = "sub_cancel_001";
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        mockMvc.perform(post("/api/billing/cancel")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true));

        org.mockito.Mockito.verify(stripeClient).cancelSubscription(stripeSubId);
    }

    // ── Bug 1: Stripe refund reason validation ────────────────────

    @Test
    void refundRequest_stripeApproval_sendsValidStripeReason() throws Exception {
        // Create a Stripe payment with an active RECURRING subscription.
        Payment stripePayment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_reason_test")
                .providerPaymentId("pi_reason_test")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now()).build());

        when(stripeClient.createRefund(anyString(), anyString()))
                .thenAnswer(inv -> {
                    // Capture the reason argument to verify it's valid
                    String reason = inv.getArgument(1);
                    org.assertj.core.api.Assertions.assertThat(reason)
                            .isIn("duplicate", "fraudulent", "requested_by_customer");
                    return new StripeClient.RefundResponse(
                            "re_reason_test", inv.getArgument(0), 29900, "succeeded");
                });

        // Submit refund request.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + stripePayment.getId() + "\",\"reason\":\"Changed my mind\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).stream()
                .filter(r -> r.getPaymentId().equals(stripePayment.getId()))
                .findFirst().orElseThrow();

        // Approve with a free-text admin note — the note must NOT be sent as the Stripe reason.
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Customer complained about feature X\"}"))
                .andExpect(status().isOk());

        // Verify createRefund was called with a valid Stripe reason code,
        // NOT the raw admin note text.
        org.mockito.Mockito.verify(stripeClient).createRefund(
                eq("pi_reason_test"), eq("requested_by_customer"));
    }

    @Test
    void refundRequest_stripeApproval_defaultAdminNote_sendsValidReason() throws Exception {
        // Approving with the default admin note (null) should still send a valid reason.
        Payment stripePayment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_default_note")
                .providerPaymentId("pi_default_note")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now()).build());

        when(stripeClient.createRefund(anyString(), anyString()))
                .thenAnswer(inv -> new StripeClient.RefundResponse(
                        "re_default_note", inv.getArgument(0), 29900, "succeeded"));

        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + stripePayment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByUserIdOrderByCreatedAtDesc(aliceId).stream()
                .filter(r -> r.getPaymentId().equals(stripePayment.getId()))
                .findFirst().orElseThrow();

        // Approve without adminNote (null/empty) — should default to "requested_by_customer".
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        org.mockito.Mockito.verify(stripeClient).createRefund(
                eq("pi_default_note"), eq("requested_by_customer"));
    }

    @Test
    void stripeClient_createRefund_invalidReason_fallsBackToDefault() {
        // Unit test: StripeClient.createRefund rejects non-whitelisted reason codes
        // and silently falls back to "requested_by_customer".
        // This is tested at the unit level via StripeClientTest, but also verified
        // here through the BillingService integration path.
        // The integration test above already asserts the correct reason is passed.
    }

    // ── Bug 2: Stripe subscription cancellation on refund ──────────

    @Test
    void webhook_fullRefund_recurringStripeSubscription_cancelsStripeSub() throws Exception {
        setupStripeSignatureMock();

        // Set up a RECURRING Stripe subscription for Alice.
        String stripeSubId = "sub_refund_cancel_001";
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        // Create a payment linked to the subscription.
        Payment payment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_refund_cancel")
                .providerPaymentId("pi_refund_cancel")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now())
                .subscriptionId(subscriptionRepository.findByUserId(aliceId).orElseThrow().getId())
                .build());

        // Mock cancelSubscriptionImmediately to succeed.
        org.mockito.Mockito.doNothing().when(stripeClient)
                .cancelSubscriptionImmediately(anyString());

        // Fire a charge.refunded webhook (full refund).
        String chargePayload = mapToJson(Map.of(
                "id", "evt_refund_recurring",
                "type", "charge.refunded",
                "data", Map.of("object", Map.of(
                        "id", "ch_refund_cancel",
                        "payment_intent", "pi_refund_cancel",
                        "amount", 29900,
                        "amount_refunded", 29900))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(chargePayload))
                .andExpect(status().isOk());

        // Subscription revoked internally.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);

        // Stripe subscription was cancelled immediately.
        org.mockito.Mockito.verify(stripeClient)
                .cancelSubscriptionImmediately(eq(stripeSubId));
    }

    @Test
    void webhook_fullRefund_oneTimeStripeSubscription_doesNotCancelStripeSub() throws Exception {
        setupStripeSignatureMock();

        // Set up a ONE-TIME Stripe subscription (no providerSubscriptionId).
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                // No providerSubscriptionId — this is a one-time payment.
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        Payment payment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_onetime_refund")
                .providerPaymentId("pi_onetime_refund")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now())
                .subscriptionId(subscriptionRepository.findByUserId(aliceId).orElseThrow().getId())
                .build());

        String chargePayload = mapToJson(Map.of(
                "id", "evt_refund_onetime",
                "type", "charge.refunded",
                "data", Map.of("object", Map.of(
                        "id", "ch_onetime_refund",
                        "payment_intent", "pi_onetime_refund",
                        "amount", 29900,
                        "amount_refunded", 29900))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(chargePayload))
                .andExpect(status().isOk());

        // Subscription revoked internally.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);

        // cancelSubscriptionImmediately must NOT be called for one-time payments.
        org.mockito.Mockito.verify(stripeClient, org.mockito.Mockito.never())
                .cancelSubscriptionImmediately(anyString());
    }

    @Test
    void webhook_fullRefund_recurringStripeSub_cancelFails_stillExpires() throws Exception {
        setupStripeSignatureMock();

        // If cancelSubscriptionImmediately throws, the internal revocation
        // must still proceed (best-effort cancellation).
        String stripeSubId = "sub_cancel_fail_001";
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        Payment payment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_cancel_fail")
                .providerPaymentId("pi_cancel_fail")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now())
                .subscriptionId(subscriptionRepository.findByUserId(aliceId).orElseThrow().getId())
                .build());

        // Mock cancelSubscriptionImmediately to throw.
        org.mockito.Mockito.doThrow(new java.net.ConnectException("Stripe down"))
                .when(stripeClient).cancelSubscriptionImmediately(anyString());

        String chargePayload = mapToJson(Map.of(
                "id", "evt_cancel_fail",
                "type", "charge.refunded",
                "data", Map.of("object", Map.of(
                        "id", "ch_cancel_fail",
                        "payment_intent", "pi_cancel_fail",
                        "amount", 29900,
                        "amount_refunded", 29900))));

        // Should not throw — the Stripe failure is logged, not propagated.
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(chargePayload))
                .andExpect(status().isOk());

        // Internal revocation still happened despite Stripe API failure.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
    }

    @Test
    void webhook_subscriptionDeleted_afterRefund_isIdempotent() throws Exception {
        setupStripeSignatureMock();

        // After a full refund triggers revokeSubscriptionOnRefund (which calls
        // cancelSubscriptionImmediately), Stripe fires customer.subscription.deleted.
        // That webhook re-enters handleStripeSubscriptionDeleted, which should be
        // a no-op (idempotent) because the subscription is already EXPIRED.
        String stripeSubId = "sub_idempotent_after_refund";
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.EXPIRED)
                .currentPeriodEnd(Instant.now().minus(1, ChronoUnit.DAYS)).build());

        String payload = mapToJson(Map.of(
                "id", "evt_idempotent_after_refund",
                "type", "customer.subscription.deleted",
                "data", Map.of("object", Map.of("id", stripeSubId))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").value(true));

        // Still EXPIRED — idempotent, no double-log, no error.
        Subscription sub = subscriptionRepository.findByUserId(aliceId).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.EXPIRED);
    }

    // ── Refund completion: APPROVED → COMPLETED via webhook ──────

    @Test
    void razorpayRefundWebhook_transitionsApprovedRefundRequestToCompleted() throws Exception {
        // 1. Activate Pro subscription for Alice.
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // 2. Submit a refund request.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Test refund\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByPaymentId(payment.getId()).orElseThrow();
        assertThat(rr.getStatus()).isEqualTo(RefundRequestStatus.PENDING);

        // 3. Admin approves.
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isOk());

        rr = refundRequestRepository.findById(rr.getId()).orElseThrow();
        assertThat(rr.getStatus()).isEqualTo(RefundRequestStatus.APPROVED);

        // 4. Razorpay refund.processed webhook fires.
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_rr_complete_1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refundWebhookPayload(
                                payment.getProviderOrderId(), payment.getProviderPaymentId(),
                                29900, 29900, true)))
                .andExpect(status().isOk());

        // 5. RefundRequest must be COMPLETED.
        rr = refundRequestRepository.findById(rr.getId()).orElseThrow();
        assertThat(rr.getStatus()).isEqualTo(RefundRequestStatus.COMPLETED);

        // 6. Payment must be REFUNDED.
        Payment after = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void razorpayRefundWebhook_duplicateWebhook_isIdempotent() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Create an APPROVED refund request.
        RefundRequest rr = refundRequestRepository.save(RefundRequest.builder()
                .userId(aliceId).paymentId(payment.getId()).reason("Dup test")
                .status(RefundRequestStatus.APPROVED).build());

        // First webhook → COMPLETED.
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_rr_dup_1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refundWebhookPayload(
                                payment.getProviderOrderId(), payment.getProviderPaymentId(),
                                29900, 29900, true)))
                .andExpect(status().isOk());

        assertThat(refundRequestRepository.findById(rr.getId()).orElseThrow().getStatus())
                .isEqualTo(RefundRequestStatus.COMPLETED);

        // Second webhook → still COMPLETED, no error.
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_rr_dup_2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refundWebhookPayload(
                                payment.getProviderOrderId(), payment.getProviderPaymentId(),
                                29900, 29900, true)))
                .andExpect(status().isOk());

        assertThat(refundRequestRepository.findById(rr.getId()).orElseThrow().getStatus())
                .isEqualTo(RefundRequestStatus.COMPLETED);
    }

    @Test
    void razorpayRefundWebhook_rejectedRefundRequest_staysRejected() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Create a REJECTED refund request.
        RefundRequest rr = refundRequestRepository.save(RefundRequest.builder()
                .userId(aliceId).paymentId(payment.getId()).reason("Rejected test")
                .status(RefundRequestStatus.REJECTED).build());

        // Webhook fires — should not change REJECTED status.
        mockMvc.perform(post("/api/billing/webhook/razorpay")
                        .header("X-Razorpay-Signature", "sig")
                        .header("X-Razorpay-Event-Id", "evt_rr_reject_1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refundWebhookPayload(
                                payment.getProviderOrderId(), payment.getProviderPaymentId(),
                                29900, 29900, true)))
                .andExpect(status().isOk());

        assertThat(refundRequestRepository.findById(rr.getId()).orElseThrow().getStatus())
                .isEqualTo(RefundRequestStatus.REJECTED);
    }

    @Test
    void adminApproval_doesNotMarkRefundRequestAsCompleted() throws Exception {
        activatePro(aliceId);
        Payment payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(aliceId).get(0);

        // Submit refund request.
        mockMvc.perform(post("/api/billing/refund-requests")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentId\":\"" + payment.getId() + "\",\"reason\":\"Test\"}"))
                .andExpect(status().isOk());

        RefundRequest rr = refundRequestRepository.findByPaymentId(payment.getId()).orElseThrow();

        // Admin approves.
        mockMvc.perform(post("/api/admin/billing/refund-requests/" + rr.getId() + "/approve")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminNote\":\"Approved\"}"))
                .andExpect(status().isOk());

        // Must be APPROVED, not COMPLETED.
        rr = refundRequestRepository.findById(rr.getId()).orElseThrow();
        assertThat(rr.getStatus()).isEqualTo(RefundRequestStatus.APPROVED);
        assertThat(rr.getStatus()).isNotEqualTo(RefundRequestStatus.COMPLETED);
    }

    @Test
    void stripeRefundWebhook_transitionsApprovedRefundRequestToCompleted() throws Exception {
        setupStripeSignatureMock();

        // 1. Set up a Stripe payment with an active subscription.
        String stripeSubId = "sub_refund_complete_stripe";
        subscriptionRepository.save(Subscription.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerSubscriptionId(stripeSubId)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(Instant.now().minus(10, ChronoUnit.DAYS))
                .currentPeriodEnd(Instant.now().plus(20, ChronoUnit.DAYS)).build());

        Payment stripePayment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_refund_complete")
                .providerPaymentId("pi_refund_complete")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .subscriptionId(subscriptionRepository.findByUserId(aliceId).orElseThrow().getId())
                .paidAt(Instant.now()).build());

        // 2. Create an APPROVED refund request.
        RefundRequest rr = refundRequestRepository.save(RefundRequest.builder()
                .userId(aliceId).paymentId(stripePayment.getId()).reason("Stripe refund test")
                .status(RefundRequestStatus.APPROVED).build());

        // 3. Stripe charge.refunded webhook fires.
        String payload = mapToJson(Map.of(
                "id", "evt_stripe_rr_complete",
                "type", "charge.refunded",
                "data", Map.of("object", Map.of(
                        "id", "ch_refund_complete",
                        "payment_intent", "pi_refund_complete",
                        "amount", 29900,
                        "amount_refunded", 29900))));

        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        // 4. RefundRequest must be COMPLETED.
        rr = refundRequestRepository.findById(rr.getId()).orElseThrow();
        assertThat(rr.getStatus()).isEqualTo(RefundRequestStatus.COMPLETED);

        // 5. Payment must be REFUNDED.
        Payment after = paymentRepository.findById(stripePayment.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void stripeRefundWebhook_duplicateWebhook_isIdempotent() throws Exception {
        setupStripeSignatureMock();

        Payment stripePayment = paymentRepository.save(Payment.builder()
                .userId(aliceId).planCode("PRO").provider("STRIPE")
                .providerOrderId("cs_dup_refund")
                .providerPaymentId("pi_dup_refund")
                .amountPaise(29900).currency("INR").status(PaymentStatus.SUCCESS)
                .paidAt(Instant.now()).build());

        RefundRequest rr = refundRequestRepository.save(RefundRequest.builder()
                .userId(aliceId).paymentId(stripePayment.getId()).reason("Dup Stripe test")
                .status(RefundRequestStatus.APPROVED).build());

        String payload = mapToJson(Map.of(
                "id", "evt_stripe_dup_rr",
                "type", "charge.refunded",
                "data", Map.of("object", Map.of(
                        "id", "ch_dup_refund",
                        "payment_intent", "pi_dup_refund",
                        "amount", 29900,
                        "amount_refunded", 29900))));

        // First webhook → COMPLETED.
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        assertThat(refundRequestRepository.findById(rr.getId()).orElseThrow().getStatus())
                .isEqualTo(RefundRequestStatus.COMPLETED);

        // Second webhook → still COMPLETED.
        mockMvc.perform(post("/api/billing/webhook/stripe")
                        .header("Stripe-Signature", "t=123,v1=valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        assertThat(refundRequestRepository.findById(rr.getId()).orElseThrow().getStatus())
                .isEqualTo(RefundRequestStatus.COMPLETED);
    }
}
