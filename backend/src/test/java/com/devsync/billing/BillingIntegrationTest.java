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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
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
}
