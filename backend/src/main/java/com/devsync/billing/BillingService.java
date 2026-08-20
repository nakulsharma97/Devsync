package com.devsync.billing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.auth.EmailService;
import com.devsync.billing.dto.*;
import com.devsync.billing.entity.*;
import com.devsync.billing.repository.PaymentRepository;
import com.devsync.billing.repository.PlanRepository;
import com.devsync.billing.repository.SubscriptionRepository;
import com.devsync.billing.repository.WebhookEventRepository;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.notification.NotificationService;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Billing orchestration. The backend is the sole source of truth for plan
 * state: the frontend only ever receives a checkout order id; a paid plan is
 * activated exclusively by a signature-verified provider webhook.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    private static final int BILLING_PERIOD_DAYS = 30;
    private static final String CURRENCY = "INR";

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final WebhookEventRepository webhookEventRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final PlanService planService;
    private final EntitlementService entitlements;
    private final RazorpayClient razorpayClient;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    // ── Checkout ──────────────────────────────────────────────────

    /**
     * Creates a provider order and a PENDING payment row. The plan is NOT
     * activated here — only the webhook does that.
     */
    @Transactional
    public CheckoutResponse createCheckout(String userId, String planCode) {
        Plan plan = planRepository.findByCode(planCode)
                .filter(Plan::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Plan", planCode));
        if (plan.getPriceInr() <= 0) {
            throw new IllegalArgumentException("The " + plan.getName() + " plan does not require a payment");
        }

        Subscription existing = subscriptionRepository.findByUserId(userId).orElse(null);
        if (existing != null && existing.getPlanCode().equals(planCode)
                && List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.TRIALING)
                        .contains(existing.getStatus())
                && (existing.getCurrentPeriodEnd() == null
                        || !existing.getCurrentPeriodEnd().isBefore(Instant.now()))) {
            throw new IllegalArgumentException("You are already subscribed to the " + plan.getName() + " plan");
        }

        long amountPaise = plan.getPriceInr() * 100L;
        RazorpayClient.Order order;
        try {
            order = razorpayClient.createOrder(amountPaise, CURRENCY, "devsync_" + userId);
        } catch (PaymentNotConfiguredException e) {
            // Let this specific, already-mapped exception (→ 503) pass through
            // untouched instead of being swallowed into a generic 500.
            throw e;
        } catch (Exception e) {
            log.error("Checkout order creation failed for user {}", userId, e);
            throw new IllegalStateException("Unable to start checkout. Please try again.");
        }

        paymentRepository.save(Payment.builder()
                .userId(userId)
                .planCode(planCode)
                .providerOrderId(order.orderId())
                .amountPaise(order.amountPaise())
                .currency(order.currency())
                .status(PaymentStatus.PENDING)
                .build());

        auditLogService.record(userId, userId, AuditAction.CHECKOUT_CREATED, AuditStatus.SUCCESS,
                "Checkout created for plan " + planCode + " (" + plan.getPriceInr() + " INR)");
        return CheckoutResponse.builder()
                .orderId(order.orderId())
                .amountPaise(order.amountPaise())
                .currency(order.currency())
                .keyId(razorpayClient.getKeyId())
                .planCode(planCode)
                .planName(plan.getName())
                .build();
    }

    // ── Webhook ───────────────────────────────────────────────────

    public record WebhookAck(String event, boolean processed, boolean duplicate) {}

    /**
     * Processes a provider webhook. Steps:
     *  1. Verify the HMAC signature (unsigned/mismatched ⇒ rejected).
     *  2. Idempotency: a provider event id already seen is acknowledged, never
     *     re-processed (unique (provider, provider_event_id)).
     *  3. Map the provider event into payment/subscription state with amount +
     *     currency cross-checks against the stored order.
     */
    @Transactional
    public WebhookAck handleRazorpayWebhook(byte[] payload, String signature) {
        if (!razorpayClient.verifyWebhookSignature(payload, signature)) {
            throw new IllegalArgumentException("Invalid webhook signature");
        }
        try {
            JsonNode root = objectMapper.readTree(payload);
            String eventId = root.path("event_id").asText("");
            String event = root.path("event").asText("");
            if (eventId.isBlank() || event.isBlank()) {
                throw new IllegalArgumentException("Malformed webhook payload");
            }

            if (webhookEventRepository.existsByProviderAndProviderEventId("RAZORPAY", eventId)) {
                log.info("Duplicate webhook event ignored: {}", eventId);
                return new WebhookAck(event, false, true);
            }

            WebhookEvent stored = webhookEventRepository.save(WebhookEvent.builder()
                    .provider("RAZORPAY")
                    .providerEventId(eventId)
                    .eventType(event)
                    .payload(payload.length <= 64_000 ? new String(payload, StandardCharsets.UTF_8) : null)
                    .build());

            RazorpayEventType type = parseEvent(event);
            switch (type) {
                case PAYMENT_CAPTURED, ORDER_PAID -> handlePaymentCaptured(root, eventId);
                case PAYMENT_FAILED -> handlePaymentFailed(root, eventId);
                case PAYMENT_REFUNDED -> handlePaymentRefunded(root, eventId);
                case SUBSCRIPTION_CANCELLED -> handleSubscriptionCancelled(root, eventId);
                case SUBSCRIPTION_EXPIRED -> handleSubscriptionExpired(root, eventId);
                case SUBSCRIPTION_ACTIVATED -> handleSubscriptionActivated(root, eventId);
                case SUBSCRIPTION_CHANGED -> handleSubscriptionChanged(root, eventId);
                default -> log.info("Webhook event {} ({}) recorded, not processed", eventId, event);
            }

            stored.setProcessed(true);
            stored.setProcessedAt(Instant.now());
            webhookEventRepository.save(stored);
            return new WebhookAck(event, true, false);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            throw new IllegalStateException("Webhook processing failed");
        }
    }

    private void handlePaymentCaptured(JsonNode root, String eventId) {
        RazorpayClient.PaymentRef ref = extractPaymentRef(root);
        if (ref == null) return;
        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(ref.orderId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown order " + ref.orderId()));
        if (payment.getAmountPaise() != ref.amountPaise() || !CURRENCY.equals(ref.currency())) {
            log.error("Webhook amount/currency mismatch for event {}", eventId);
            throw new IllegalArgumentException("Webhook amount/currency mismatch");
        }
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return; // already processed (out-of-order duplicate)
        }

        payment.setProviderPaymentId(ref.paymentId());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(Instant.now());
        paymentRepository.save(payment);

        Subscription subscription = activateOrRenew(payment.getUserId(), payment.getPlanCode());
        payment.setSubscriptionId(subscription.getId());
        paymentRepository.save(payment);

        String planName = planName(payment.getPlanCode());
        boolean renewal = subscription.getCurrentPeriodStart() != null
                && subscription.getCurrentPeriodStart().plus(1, ChronoUnit.DAYS).isBefore(Instant.now());
        auditLogService.record(payment.getUserId(), payment.getUserId(),
                renewal ? AuditAction.SUBSCRIPTION_RENEWED : AuditAction.SUBSCRIPTION_ACTIVATED,
                AuditStatus.SUCCESS,
                (renewal ? "Renewed " : "Activated ") + planName + " plan (payment " + ref.paymentId() + ")");
        auditLogService.record(payment.getUserId(), payment.getUserId(),
                AuditAction.PAYMENT_SUCCESS, AuditStatus.SUCCESS,
                "Payment " + ref.paymentId() + " captured for " + planName);
        notify(payment.getUserId(), "PAYMENT_SUCCESS",
                renewal ? "Payment received" : "Welcome to " + planName,
                renewal ? "Your " + planName + " subscription has been renewed."
                        : "Your " + planName + " plan is now active. Enjoy the extra features!",
                null);
        // Email notification (non-blocking)
        sendBillingEmail(user -> {
            if (renewal) {
                emailService.sendSubscriptionRenewal(user.getEmail(), user.getFullName(),
                        planName, payment.getAmountPaise(), payment.getCurrency(), ref.paymentId());
            } else {
                emailService.sendPaymentReceipt(user.getEmail(), user.getFullName(),
                        planName, payment.getAmountPaise(), payment.getCurrency(), ref.paymentId());
            }
        }, payment.getUserId());
    }

    private void handlePaymentFailed(JsonNode root, String eventId) {
        JsonNode entity = paymentEntity(root);
        String paymentId = entity.path("id").asText("");
        String orderId = entity.path("order_id").asText("");
        if (orderId.isBlank()) return;
        paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(orderId).ifPresent(payment -> {
            payment.setProviderPaymentId(paymentId);
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            auditLogService.record(payment.getUserId(), payment.getUserId(),
                    AuditAction.PAYMENT_FAILED, AuditStatus.FAILURE,
                    "Payment " + paymentId + " failed");
            notify(payment.getUserId(), "PAYMENT_FAILED", "Payment failed",
                    "Your payment for the " + planName(payment.getPlanCode()) + " plan could not be completed.",
                    null);
            // Renewal payment failed: enter the grace period instead of dropping access.
            subscriptionRepository.findByUserId(payment.getUserId())
                    .filter(s -> s.getPlanCode().equals(payment.getPlanCode()))
                    .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE)
                    .ifPresent(s -> {
                        s.setStatus(SubscriptionStatus.PAST_DUE);
                        subscriptionRepository.save(s);
                        notify(s.getUserId(), "SUBSCRIPTION_PAST_DUE", "Action needed",
                                "Your " + planName(s.getPlanCode()) + " renewal payment failed. You keep access for now — update your payment method to avoid interruption.",
                                null);
                    });
            // Email notification (non-blocking)
            sendBillingEmail(user ->
                    emailService.sendPaymentFailed(user.getEmail(), user.getFullName(),
                            planName(payment.getPlanCode())),
                    payment.getUserId());
        });
        log.info("Webhook {} recorded payment failure for order {}", eventId, orderId);
    }

    private void handlePaymentRefunded(JsonNode root, String eventId) {
        JsonNode entity = paymentEntity(root);
        String paymentId = entity.path("id").asText("");
        String orderId = entity.path("order_id").asText("");
        paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(orderId).ifPresent(payment -> {
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
            auditLogService.record(payment.getUserId(), payment.getUserId(),
                    AuditAction.REFUND_PROCESSED, AuditStatus.SUCCESS,
                    "Refund for payment " + paymentId);
            notify(payment.getUserId(), "PAYMENT_REFUNDED", "Refund processed",
                    "A refund for your " + planName(payment.getPlanCode()) + " payment has been processed.",
                    null);
            // Email notification (non-blocking)
            sendBillingEmail(user ->
                    emailService.sendRefundProcessed(user.getEmail(), user.getFullName(),
                            planName(payment.getPlanCode())),
                    payment.getUserId());
        });
        log.info("Webhook {} recorded refund for order {}", eventId, orderId);
    }

    private void handleSubscriptionCancelled(JsonNode root, String eventId) {
        // Extract the subscription entity from the webhook payload.
        JsonNode entity = root.path("payload").path("subscription").path("entity");
        if (entity.isMissingNode() || entity.isNull()) {
            log.info("Webhook {} has no subscription entity, skipping", eventId);
            return;
        }
        String providerSubId = entity.path("id").asText("");
        if (providerSubId.isBlank()) return;

        // Find the DevSync subscription by provider subscription ID.
        Subscription subscription = subscriptionRepository
                .findByProviderSubscriptionId(providerSubId)
                .orElse(null);
        if (subscription == null) {
            log.info("No local subscription for provider sub {} (event {}), ignoring", providerSubId, eventId);
            return;
        }

        // Idempotent: if already cancelled/expired, skip.
        if (subscription.getStatus() == SubscriptionStatus.CANCELLED
                || subscription.getStatus() == SubscriptionStatus.EXPIRED) {
            log.info("Subscription {} already {} — ignoring duplicate cancel event {}",
                    subscription.getId(), subscription.getStatus(), eventId);
            return;
        }

        // The user requested cancellation — mark cancelAtPeriodEnd so they
        // keep access until the current period ends.
        subscription.setCancelAtPeriodEnd(true);
        subscriptionRepository.save(subscription);

        String planCode = subscription.getPlanCode();
        auditLogService.record(subscription.getUserId(), subscription.getUserId(),
                AuditAction.SUBSCRIPTION_CANCELLED, AuditStatus.SUCCESS,
                "Subscription cancelled via provider webhook (" + providerSubId + ")");
        notify(subscription.getUserId(), "SUBSCRIPTION_CANCELLED", "Subscription cancelled",
                "Your " + planName(planCode) + " subscription has been cancelled and will end on "
                        + subscription.getCurrentPeriodEnd() + ".",
                null);
        // Email notification (non-blocking)
        sendBillingEmail(user ->
                emailService.sendSubscriptionCancelled(user.getEmail(), user.getFullName(),
                        planName(planCode), subscription.getCurrentPeriodEnd().toString()),
                subscription.getUserId());
        log.info("Subscription {} cancelled at period end via webhook {}", subscription.getId(), eventId);
    }

    private void handleSubscriptionExpired(JsonNode root, String eventId) {
        JsonNode entity = root.path("payload").path("subscription").path("entity");
        if (entity.isMissingNode() || entity.isNull()) return;
        String providerSubId = entity.path("id").asText("");
        if (providerSubId.isBlank()) return;

        Subscription subscription = subscriptionRepository
                .findByProviderSubscriptionId(providerSubId)
                .orElse(null);
        if (subscription == null) {
            log.info("No local subscription for provider sub {} (event {}), ignoring", providerSubId, eventId);
            return;
        }

        // Idempotent: if already expired, skip.
        if (subscription.getStatus() == SubscriptionStatus.EXPIRED) {
            log.info("Subscription {} already expired — ignoring duplicate expiry event {}",
                    subscription.getId(), eventId);
            return;
        }

        // Expire: the billing period ended without renewal.
        subscription.setStatus(SubscriptionStatus.EXPIRED);
        subscription.setCancelAtPeriodEnd(false);
        subscription.setPlanCode(PlanCode.FREE);
        subscription.setCurrentPeriodEnd(Instant.now());
        subscriptionRepository.save(subscription);

        auditLogService.record(subscription.getUserId(), subscription.getUserId(),
                AuditAction.SUBSCRIPTION_EXPIRED, AuditStatus.SUCCESS,
                "Subscription expired via provider webhook (" + providerSubId + ")");
        notify(subscription.getUserId(), "SUBSCRIPTION_EXPIRED", "Subscription expired",
                "Your subscription has expired. You are now on the Free plan. "
                        + "Upgrade anytime to regain access to premium features.",
                null);
        // Email notification (non-blocking)
        sendBillingEmail(user ->
                emailService.sendSubscriptionExpired(user.getEmail(), user.getFullName()),
                subscription.getUserId());
        log.info("Subscription {} expired via webhook {} — downgraded to FREE", subscription.getId(), eventId);
    }

    private void handleSubscriptionActivated(JsonNode root, String eventId) {
        JsonNode entity = root.path("payload").path("subscription").path("entity");
        if (entity.isMissingNode() || entity.isNull()) return;
        String providerSubId = entity.path("id").asText("");
        String planCode = entity.path("plan_id").asText("");
        if (providerSubId.isBlank()) return;

        Subscription subscription = subscriptionRepository
                .findByProviderSubscriptionId(providerSubId)
                .orElse(null);
        if (subscription == null) {
            log.info("No local subscription for provider sub {} (event {}), ignoring", providerSubId, eventId);
            return;
        }

        // Activate the subscription if it was pending.
        if (subscription.getStatus() == SubscriptionStatus.INCOMPLETE
                || subscription.getStatus() == SubscriptionStatus.CANCELLED) {
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setCancelAtPeriodEnd(false);
            subscriptionRepository.save(subscription);
            log.info("Subscription {} activated via webhook {}", subscription.getId(), eventId);
        }
    }

    private void handleSubscriptionChanged(JsonNode root, String eventId) {
        JsonNode entity = root.path("payload").path("subscription").path("entity");
        if (entity.isMissingNode() || entity.isNull()) return;
        String providerSubId = entity.path("id").asText("");
        if (providerSubId.isBlank()) return;

        Subscription subscription = subscriptionRepository
                .findByProviderSubscriptionId(providerSubId)
                .orElse(null);
        if (subscription == null) return;

        // Sync cancellation state from provider.
        boolean cancelAtEnd = "yes".equalsIgnoreCase(entity.path("cancel_at_period_end").asText("no"));
        if (cancelAtEnd != subscription.isCancelAtPeriodEnd()) {
            subscription.setCancelAtPeriodEnd(cancelAtEnd);
            subscriptionRepository.save(subscription);
            log.info("Subscription {} cancel_at_period_end synced to {} via webhook {}",
                    subscription.getId(), cancelAtEnd, eventId);
        }
    }

    /** Creates the subscription on first payment, or extends the period on renewal. */
    private Subscription activateOrRenew(String userId, String planCode) {
        Instant now = Instant.now();
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElse(null);
        if (subscription == null) {
            return subscriptionRepository.save(Subscription.builder()
                    .userId(userId)
                    .planCode(planCode)
                    .status(SubscriptionStatus.ACTIVE)
                    .currentPeriodStart(now)
                    .currentPeriodEnd(now.plus(BILLING_PERIOD_DAYS, ChronoUnit.DAYS))
                    .build());
        }
        boolean paidNow = subscription.getStatus() == SubscriptionStatus.ACTIVE
                || subscription.getStatus() == SubscriptionStatus.PAST_DUE
                || subscription.getStatus() == SubscriptionStatus.TRIALING;
        boolean withinPeriod = subscription.getCurrentPeriodEnd() == null
                || !subscription.getCurrentPeriodEnd().isBefore(now);
        if (paidNow && withinPeriod && subscription.getPlanCode().equals(planCode)) {
            // Renewal: extend from the later of now / current period end.
            Instant base = subscription.getCurrentPeriodEnd() != null
                    && subscription.getCurrentPeriodEnd().isAfter(now)
                    ? subscription.getCurrentPeriodEnd() : now;
            subscription.setCurrentPeriodStart(now);
            subscription.setCurrentPeriodEnd(base.plus(BILLING_PERIOD_DAYS, ChronoUnit.DAYS));
        } else {
            // Upgrade / reactivation: full new period.
            subscription.setPlanCode(planCode);
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setCurrentPeriodStart(now);
            subscription.setCurrentPeriodEnd(now.plus(BILLING_PERIOD_DAYS, ChronoUnit.DAYS));
            auditLogService.record(userId, userId, AuditAction.PLAN_CHANGED, AuditStatus.SUCCESS,
                    "Plan changed to " + planCode);
        }
        subscription.setCancelAtPeriodEnd(false);
        return subscriptionRepository.save(subscription);
    }

    // ── Cancellation ──────────────────────────────────────────────

    @Transactional
    public SubscriptionResponse cancelSubscription(String userId) {
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .filter(s -> List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE)
                        .contains(s.getStatus()))
                .filter(s -> s.getCurrentPeriodEnd() == null || !s.getCurrentPeriodEnd().isBefore(Instant.now()))
                .orElseThrow(() -> new IllegalArgumentException("You do not have an active paid subscription"));
        subscription.setCancelAtPeriodEnd(true);
        subscriptionRepository.save(subscription);
        auditLogService.record(userId, userId, AuditAction.SUBSCRIPTION_CANCELLED, AuditStatus.SUCCESS,
                "Cancelled " + planName(subscription.getPlanCode()) + " at period end");
        notify(userId, "SUBSCRIPTION_CANCELLED", "Subscription cancelled",
                "Your " + planName(subscription.getPlanCode()) + " plan will end on "
                        + subscription.getCurrentPeriodEnd() + ". You keep paid features until then.",
                null);
        return toSubscriptionResponse(subscription);
    }

    // ── Reads (user) ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SubscriptionResponse getSubscription(String userId) {
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElse(null);
        if (subscription == null
                || subscription.getStatus() == SubscriptionStatus.EXPIRED
                || subscription.getStatus() == SubscriptionStatus.CANCELLED
                || (subscription.getCurrentPeriodEnd() != null
                        && subscription.getCurrentPeriodEnd().isBefore(Instant.now()))) {
            return toSubscriptionResponse(null);
        }
        return toSubscriptionResponse(subscription);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(String userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toPaymentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UsageResponse getUsage(String userId) {
        Plan plan = planService.getEffectivePlan(userId);
        return UsageResponse.builder()
                .planCode(plan.getCode())
                .planName(plan.getName())
                .privateProjects(UsageResponse.PrivateProjectUsage.builder()
                        .used(entitlements.countPrivateProjects(userId))
                        .limit(plan.getPrivateProjectLimit())
                        .build())
                .storage(UsageResponse.StorageUsage.builder()
                        .usedBytes(entitlements.storageUsed(userId))
                        .limitBytes(plan.getStorageBytes())
                        .build())
                .members(UsageResponse.MemberUsage.builder()
                        .maxInOwnedProject(entitlements.maxMembersInOwnedProjects(userId))
                        .limit(plan.getMembersPerProject())
                        .build())
                .advancedAnalytics(plan.isAdvancedAnalytics())
                .build();
    }

    @Transactional(readOnly = true)
    public AdminBillingStats getAdminBillingStats() {
        long active = subscriptionRepository.countByStatus(SubscriptionStatus.ACTIVE);
        long cancelled = subscriptionRepository.countByStatus(SubscriptionStatus.CANCELLED);
        long expired = subscriptionRepository.countByStatus(SubscriptionStatus.EXPIRED);
        long pastDue = subscriptionRepository.countByStatus(SubscriptionStatus.PAST_DUE);
        long pro = subscriptionRepository.countByPlanCode(PlanCode.PRO);
        long enterprise = subscriptionRepository.countByPlanCode(PlanCode.ENTERPRISE);
        long totalSubs = active + cancelled + expired + pastDue
                + subscriptionRepository.countByStatus(SubscriptionStatus.TRIALING)
                + subscriptionRepository.countByStatus(SubscriptionStatus.INCOMPLETE);
        long totalPayments = paymentRepository.count();
        long successPayments = paymentRepository.countByStatus(PaymentStatus.SUCCESS);
        long failedPayments = paymentRepository.countByStatus(PaymentStatus.FAILED);
        long refundedPayments = paymentRepository.countByStatus(PaymentStatus.REFUNDED);
        long totalRevenue = paymentRepository.sumSuccessfulAmountSince(Instant.EPOCH);
        Instant monthStart = java.time.YearMonth.now().atDay(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
        Instant yearStart = java.time.LocalDate.ofYearDay(java.time.Year.now().getValue(), 1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
        long revenueMonth = paymentRepository.sumSuccessfulAmountSince(monthStart);
        long revenueYear = paymentRepository.sumSuccessfulAmountSince(yearStart);

        return AdminBillingStats.builder()
                .totalSubscriptions(totalSubs)
                .activeSubscriptions(active)
                .cancelledSubscriptions(cancelled)
                .expiredSubscriptions(expired)
                .pastDueSubscriptions(pastDue)
                .freeUsers(userRepository.count() - pro - enterprise)
                .proUsers(pro)
                .enterpriseUsers(enterprise)
                .totalPayments(totalPayments)
                .successfulPayments(successPayments)
                .failedPayments(failedPayments)
                .refundedPayments(refundedPayments)
                .totalRevenuePaise(totalRevenue)
                .revenueThisMonthPaise(revenueMonth)
                .revenueThisYearPaise(revenueYear)
                .build();
    }

    // ── Reads (admin) ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<AdminSubscriptionListItem> listSubscriptions(int page, int size,
            String search, String planCode, String status) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        SubscriptionStatus statusFilter = parseStatus(status);
        Page<Subscription> result = subscriptionRepository.searchAdmin(
                (search == null || search.isBlank()) ? null : search.trim(),
                (planCode == null || planCode.isBlank()) ? null : planCode.toUpperCase(),
                statusFilter, pageable);
        List<AdminSubscriptionListItem> items = result.getContent().stream()
                .map(s -> {
                    User u = userRepository.findById(s.getUserId()).orElse(null);
                    return AdminSubscriptionListItem.builder()
                            .id(s.getId())
                            .userId(s.getUserId())
                            .userName(u != null ? u.getFullName() : "Unknown")
                            .userEmail(u != null ? u.getEmail() : null)
                            .planCode(s.getPlanCode())
                            .status(s.getStatus().name())
                            .currentPeriodEnd(s.getCurrentPeriodEnd())
                            .cancelAtPeriodEnd(s.isCancelAtPeriodEnd())
                            .createdAt(s.getCreatedAt())
                            .build();
                })
                .toList();
        return PageResponse.<AdminSubscriptionListItem>builder()
                .content(items)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build();
    }

    @Transactional
    public SubscriptionResponse adminCancelSubscription(String subscriptionId, String adminId) {
        Subscription subscription = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", subscriptionId));
        subscription.setCancelAtPeriodEnd(true);
        subscriptionRepository.save(subscription);
        auditLogService.record(adminId, subscription.getUserId(), AuditAction.SUBSCRIPTION_CANCELLED,
                AuditStatus.SUCCESS, "Admin cancelled " + planName(subscription.getPlanCode())
                        + " at period end (subscription " + subscriptionId + ")");
        notify(subscription.getUserId(), "SUBSCRIPTION_CANCELLED", "Subscription cancelled",
                "Your " + planName(subscription.getPlanCode()) + " subscription was cancelled by an administrator and ends on "
                        + subscription.getCurrentPeriodEnd() + ".",
                null);
        return toSubscriptionResponse(subscription);
    }

    // ── Helpers ───────────────────────────────────────────────────

    private RazorpayClient.PaymentRef extractPaymentRef(JsonNode root) {
        JsonNode entity = paymentEntity(root);
        if (entity == null) return null;
        String paymentId = entity.path("id").asText("");
        String orderId = entity.path("order_id").asText("");
        if (paymentId.isBlank() && orderId.isBlank()) return null;
        long amount = entity.path("amount").asLong(entity.path("amount_paid").asLong(0));
        String currency = entity.path("currency").asText(CURRENCY);
        return new RazorpayClient.PaymentRef(paymentId, orderId,
                entity.path("status").asText(""), amount, currency);
    }

    private JsonNode paymentEntity(JsonNode root) {
        JsonNode entity = root.path("payload").path("payment").path("entity");
        if (!entity.isMissingNode() && !entity.isNull()) return entity;
        entity = root.path("payload").path("order").path("entity");
        if (!entity.isMissingNode() && !entity.isNull()) return entity;
        return root.path("payload").path("entity");
    }

    private RazorpayEventType parseEvent(String event) {
        return switch (event) {
            case "payment.captured" -> RazorpayEventType.PAYMENT_CAPTURED;
            case "order.paid" -> RazorpayEventType.ORDER_PAID;
            case "payment.failed" -> RazorpayEventType.PAYMENT_FAILED;
            case "payment.refunded" -> RazorpayEventType.PAYMENT_REFUNDED;
            case "payment.pending", "payment.authorized" -> RazorpayEventType.PAYMENT_PENDING;
            case "subscription.cancelled" -> RazorpayEventType.SUBSCRIPTION_CANCELLED;
            case "subscription.expired" -> RazorpayEventType.SUBSCRIPTION_EXPIRED;
            case "subscription.activated" -> RazorpayEventType.SUBSCRIPTION_ACTIVATED;
            case "subscription.charged", "subscription.updated" -> RazorpayEventType.SUBSCRIPTION_CHANGED;
            default -> RazorpayEventType.UNKNOWN;
        };
    }

    private SubscriptionStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return SubscriptionStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid subscription status filter: " + raw);
        }
    }

    private String planName(String planCode) {
        return planRepository.findByCode(planCode).map(Plan::getName).orElse(planCode);
    }

    private void notify(String userId, String type, String title, String message, String actorName) {
        try {
            notificationService.createNotification(userId, type, title, message,
                    null, actorName != null ? actorName : "DevSync", null,
                    null, "billing", "/settings/billing");
        } catch (Exception e) {
            log.warn("Billing notification failed for user {}", userId);
        }
    }

    /**
     * Safely send a billing email. Failures are logged but never cause the
     * primary transaction to roll back — the in-app notification and payment
     * state are always preserved.
     */
    private void sendBillingEmail(java.util.function.Consumer<User> mailAction, String userId) {
        try {
            userRepository.findById(userId).ifPresent(user -> {
                try {
                    mailAction.accept(user);
                } catch (Exception e) {
                    log.warn("Billing email failed for user {}", userId, e);
                }
            });
        } catch (Exception e) {
            log.warn("Failed to look up user {} for billing email", userId, e);
        }
    }

    private SubscriptionResponse toSubscriptionResponse(Subscription subscription) {
        if (subscription == null) {
            Plan free = planRepository.findByCode(PlanCode.FREE).orElse(null);
            return SubscriptionResponse.builder()
                    .planCode(PlanCode.FREE)
                    .planName(free != null ? free.getName() : "Free")
                    .priceInr(free != null ? free.getPriceInr() : 0)
                    .status("FREE")
                    .provider(null)
                    .build();
        }
        Plan plan = planRepository.findByCode(subscription.getPlanCode()).orElse(null);
        return SubscriptionResponse.builder()
                .planCode(subscription.getPlanCode())
                .planName(plan != null ? plan.getName() : subscription.getPlanCode())
                .priceInr(plan != null ? plan.getPriceInr() : 0)
                .status(subscription.getStatus().name())
                .provider(subscription.getProvider())
                .currentPeriodStart(subscription.getCurrentPeriodStart())
                .currentPeriodEnd(subscription.getCurrentPeriodEnd())
                .cancelAtPeriodEnd(subscription.isCancelAtPeriodEnd())
                .build();
    }

    private PaymentResponse toPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .planCode(payment.getPlanCode())
                .amountPaise(payment.getAmountPaise())
                .currency(payment.getCurrency())
                .status(payment.getStatus().name())
                .providerPaymentId(payment.getProviderPaymentId())
                .paidAt(payment.getPaidAt())
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
