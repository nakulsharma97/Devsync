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
import com.devsync.billing.repository.RefundRequestRepository;
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
    private final StripeClient stripeClient;
    private final RefundRequestRepository refundRequestRepository;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Value("${app.billing.refund-window-days:7}")
    private int refundWindowDays;

    /** Allowed payment provider identifiers. */
    private static final java.util.Set<String> VALID_PROVIDERS = java.util.Set.of("RAZORPAY", "STRIPE");

    // ── Checkout ──────────────────────────────────────────────────

    /**
     * Creates a provider order and a PENDING payment row. The plan is NOT
     * activated here — only the webhook does that.
     */
    @Transactional
    public CheckoutResponse createCheckout(String userId, String planCode, String provider) {
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

        // Default to RAZORPAY if no provider specified
        if (provider == null || provider.isBlank()) {
            provider = "RAZORPAY";
        }
        String providerUpper = provider.trim().toUpperCase();
        if (!VALID_PROVIDERS.contains(providerUpper)) {
            throw new IllegalArgumentException("Unsupported payment provider: " + provider
                    + ". Supported providers: RAZORPAY, STRIPE.");
        }

        long amountPaise = plan.getPriceInr() * 100L;
        String providerOrderId;
        String providerCurrency;
        long providerAmount;

        if ("STRIPE".equals(providerUpper)) {
            StripeClient.CheckoutSession session;
            try {
                session = stripeClient.createCheckoutSession(amountPaise, CURRENCY,
                        planCode, userId);
            } catch (PaymentNotConfiguredException e) {
                throw e;
            } catch (Exception e) {
                log.error("Stripe checkout session creation failed for user {}", userId, e);
                throw new IllegalStateException("Unable to start checkout. Please try again.");
            }
            providerOrderId = session.sessionId();
            providerCurrency = CURRENCY;
            providerAmount = amountPaise;

            paymentRepository.save(Payment.builder()
                    .userId(userId)
                    .planCode(planCode)
                    .provider(providerUpper)
                    .providerOrderId(providerOrderId)
                    .amountPaise(providerAmount)
                    .currency(providerCurrency)
                    .status(PaymentStatus.PENDING)
                    .build());

            auditLogService.record(userId, userId, AuditAction.CHECKOUT_CREATED, AuditStatus.SUCCESS,
                    "Stripe checkout created for plan " + planCode + " (" + plan.getPriceInr() + " INR)");
            return CheckoutResponse.builder()
                    .provider("STRIPE")
                    .checkoutUrl(session.checkoutUrl())
                    .planCode(planCode)
                    .planName(plan.getName())
                    .build();
        } else {
            // RAZORPAY
            RazorpayClient.Order order;
            try {
                order = razorpayClient.createOrder(amountPaise, CURRENCY, "devsync_" + userId);
            } catch (PaymentNotConfiguredException e) {
                throw e;
            } catch (Exception e) {
                log.error("Razorpay checkout order creation failed for user {}", userId, e);
                throw new IllegalStateException("Unable to start checkout. Please try again.");
            }
            providerOrderId = order.orderId();
            providerCurrency = order.currency();
            providerAmount = order.amountPaise();

            paymentRepository.save(Payment.builder()
                    .userId(userId)
                    .planCode(planCode)
                    .provider("RAZORPAY")
                    .providerOrderId(providerOrderId)
                    .amountPaise(providerAmount)
                    .currency(providerCurrency)
                    .status(PaymentStatus.PENDING)
                    .build());

            auditLogService.record(userId, userId, AuditAction.CHECKOUT_CREATED, AuditStatus.SUCCESS,
                    "Checkout created for plan " + planCode + " (" + plan.getPriceInr() + " INR)");
            return CheckoutResponse.builder()
                    .provider("RAZORPAY")
                    .orderId(order.orderId())
                    .amountPaise(order.amountPaise())
                    .currency(order.currency())
                    .keyId(razorpayClient.getKeyId())
                    .planCode(planCode)
                    .planName(plan.getName())
                    .build();
        }
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
    public WebhookAck handleRazorpayWebhook(byte[] payload, String signature, String eventId) {
        if (!razorpayClient.verifyWebhookSignature(payload, signature)) {
            throw new IllegalArgumentException("Invalid webhook signature");
        }
        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException("Missing X-Razorpay-Event-Id header");
        }
        eventId = eventId.trim();
        try {
            JsonNode root = objectMapper.readTree(payload);
            String event = root.path("event").asText("");
            if (event.isBlank()) {
                throw new IllegalArgumentException("Malformed webhook payload: missing event");
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

    // ── Stripe Webhook ───────────────────────────────────────────

    /**
     * Processes a Stripe webhook. Stripe events have a top-level {@code id}
     * field (unlike Razorpay), so idempotency uses that directly.
     */
    @Transactional
    public WebhookAck handleStripeWebhook(byte[] payload, String stripeSignatureHeader) {
        if (!stripeClient.verifyWebhookSignature(payload, stripeSignatureHeader)) {
            throw new IllegalArgumentException("Invalid Stripe webhook signature");
        }
        try {
            JsonNode root = objectMapper.readTree(payload);
            // Stripe puts the event id at the top level
            String eventId = root.path("id").asText("");
            String eventType = root.path("type").asText("");
            if (eventId.isBlank() || eventType.isBlank()) {
                throw new IllegalArgumentException("Malformed Stripe webhook payload");
            }

            if (webhookEventRepository.existsByProviderAndProviderEventId("STRIPE", eventId)) {
                log.info("Duplicate Stripe webhook event ignored: {}", eventId);
                return new WebhookAck(eventType, false, true);
            }

            WebhookEvent stored = webhookEventRepository.save(WebhookEvent.builder()
                    .provider("STRIPE")
                    .providerEventId(eventId)
                    .eventType(eventType)
                    .payload(payload.length <= 64_000 ? new String(payload, StandardCharsets.UTF_8) : null)
                    .build());

            switch (eventType) {
                case "checkout.session.completed" -> handleStripeCheckoutCompleted(root, eventId);
                case "invoice.paid" -> handleStripeInvoicePaid(root, eventId);
                case "invoice.payment_failed" -> handleStripeInvoicePaymentFailed(root, eventId);
                case "charge.refunded" -> handleStripeChargeRefunded(root, eventId);
                default -> log.info("Stripe webhook event {} ({}) recorded, not processed", eventId, eventType);
            }

            stored.setProcessed(true);
            stored.setProcessedAt(Instant.now());
            webhookEventRepository.save(stored);
            return new WebhookAck(eventType, true, false);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Stripe webhook processing failed", e);
            throw new IllegalStateException("Webhook processing failed");
        }
    }

    private void handleStripeCheckoutCompleted(JsonNode root, String eventId) {
        // checkout.session.completed: the session object is at data.object
        JsonNode session = root.path("data").path("object");
        String sessionId = session.path("id").asText("");
        String paymentIntentId = session.path("payment_intent").asText("");
        long amountTotal = session.path("amount_total").asLong(0);
        String currency = session.path("currency").asText("");
        String planCode = session.path("metadata").path("plan_code").asText("");
        String userId = session.path("client_reference_id").asText("");
        String paymentStatus = session.path("payment_status").asText("");

        if (sessionId.isBlank() || userId.isBlank()) {
            log.info("Stripe checkout.session.completed missing sessionId or userId, skipping");
            return;
        }

        Payment payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(sessionId)
                .orElse(null);
        if (payment == null) {
            log.info("No pending payment for Stripe session {} (event {}), skipping", sessionId, eventId);
            return;
        }
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return; // already processed
        }

        // Cross-check amount
        if (payment.getAmountPaise() != amountTotal) {
            log.error("Stripe amount mismatch for session {}: expected {} got {}",
                    sessionId, payment.getAmountPaise(), amountTotal);
            throw new IllegalArgumentException("Stripe webhook amount mismatch");
        }

        if (!"paid".equals(paymentStatus)) {
            log.info("Stripe session {} payment_status={}, not activating", sessionId, paymentStatus);
            return;
        }

        payment.setProviderPaymentId(paymentIntentId);
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(Instant.now());
        paymentRepository.save(payment);

        Subscription subscription = activateOrRenew(payment.getUserId(), payment.getPlanCode());
        payment.setSubscriptionId(subscription.getId());
        paymentRepository.save(payment);

        String resolvedPlanCode = planCode != null && !planCode.isBlank() ? planCode : payment.getPlanCode();
        String planLabel = planName(resolvedPlanCode);
        auditLogService.record(payment.getUserId(), payment.getUserId(),
                AuditAction.SUBSCRIPTION_ACTIVATED, AuditStatus.SUCCESS,
                "Stripe checkout completed — activated " + planLabel + " plan (session " + sessionId + ")");
        auditLogService.record(payment.getUserId(), payment.getUserId(),
                AuditAction.PAYMENT_SUCCESS, AuditStatus.SUCCESS,
                "Stripe payment " + paymentIntentId + " captured for " + planLabel);
        notify(payment.getUserId(), "PAYMENT_SUCCESS", "Welcome to " + planLabel,
                "Your " + planLabel + " plan is now active. Enjoy the extra features!",
                null);
        sendBillingEmail(user ->
                emailService.sendPaymentReceipt(user.getEmail(), user.getFullName(),
                        planLabel, payment.getAmountPaise(), payment.getCurrency(), paymentIntentId),
                payment.getUserId());
    }

    private void handleStripeInvoicePaid(JsonNode root, String eventId) {
        // invoice.paid: similar to checkout.session.completed for renewals
        JsonNode invoice = root.path("data").path("object");
        String sessionId = invoice.path("subscription").asText("");
        String paymentIntentId = invoice.path("payment_intent").asText("");
        long amountPaid = invoice.path("amount_paid").asLong(0);
        String customerEmail = invoice.path("customer_email").asText("");

        // For Stripe subscriptions we'd look up by subscription id; for one-time
        // payments, match by payment intent or session. For now, log and record.
        log.info("Stripe invoice.paid for {}: amount={}. event={}", sessionId, amountPaid, eventId);
    }

    private void handleStripeInvoicePaymentFailed(JsonNode root, String eventId) {
        JsonNode invoice = root.path("data").path("object");
        String sessionId = invoice.path("subscription").asText("");
        log.info("Stripe invoice.payment_failed for {}. event={}", sessionId, eventId);
    }

    private void handleStripeChargeRefunded(JsonNode root, String eventId) {
        // charge.refunded: mirror the Razorpay refund logic
        JsonNode charge = root.path("data").path("object");
        String chargeId = charge.path("id").asText("");
        long amountRefunded = charge.path("amount_refunded").asLong(0);
        long chargeAmount = charge.path("amount").asLong(0);
        String paymentIntentId = charge.path("payment_intent").asText("");
        boolean isFullRefund = chargeAmount > 0 && amountRefunded >= chargeAmount;

        // Find the payment by provider payment id (payment_intent)
        Payment payment = null;
        if (!paymentIntentId.isBlank()) {
            payment = paymentRepository.findByUserIdOrderByCreatedAtDesc(null).stream()
                    .filter(p -> paymentIntentId.equals(p.getProviderPaymentId()))
                    .findFirst().orElse(null);
        }
        // Also try matching by provider order id if we stored the session id there
        if (payment == null && !chargeId.isBlank()) {
            payment = paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(chargeId)
                    .orElse(null);
        }
        if (payment == null) {
            log.info("No payment found for Stripe charge {} (event {}), skipping", chargeId, eventId);
            return;
        }

        Payment refundPayment = payment;
        refundPayment.setStatus(PaymentStatus.REFUNDED);
        paymentRepository.save(refundPayment);

        auditLogService.record(refundPayment.getUserId(), refundPayment.getUserId(),
                AuditAction.REFUND_PROCESSED, AuditStatus.SUCCESS,
                "Stripe refund for charge " + chargeId
                        + (isFullRefund ? " (full)" : " (partial, " + amountRefunded + "/" + chargeAmount + ")"));
        notify(refundPayment.getUserId(), "PAYMENT_REFUNDED", "Refund processed",
                "A refund for your " + planName(refundPayment.getPlanCode()) + " payment has been processed.",
                null);
        sendBillingEmail(user ->
                emailService.sendRefundProcessed(user.getEmail(), user.getFullName(),
                        planName(refundPayment.getPlanCode())),
                refundPayment.getUserId());

        if (isFullRefund && refundPayment.getSubscriptionId() != null) {
            revokeSubscriptionOnRefund(refundPayment);
        } else if (!isFullRefund) {
            log.info("Partial Stripe refund ({} paise) on charge {} — subscription untouched",
                    amountRefunded, chargeId);
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
        // Refund webhooks carry both refund and payment entities.
        // Prefer payment entity for order/payment id (same as other handlers).
        JsonNode entity = paymentEntity(root);
        String paymentId = entity.path("id").asText("");
        String orderId = entity.path("order_id").asText("");

        // Determine if this is a full or partial refund.
        JsonNode refundEntity = refundEntity(root);
        long refundAmount = refundEntity.path("amount").asLong(0);
        String refundStatus = refundEntity.path("status").asText("");
        boolean isFullRefund = "processed".equals(refundStatus)
                && entity.path("amount").asLong(0) > 0
                && refundAmount >= entity.path("amount").asLong(0);

        paymentRepository.findTopByProviderOrderIdOrderByCreatedAtDesc(orderId).ifPresent(payment -> {
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
            auditLogService.record(payment.getUserId(), payment.getUserId(),
                    AuditAction.REFUND_PROCESSED, AuditStatus.SUCCESS,
                    "Refund for payment " + paymentId
                            + (isFullRefund ? " (full)" : " (partial, " + refundAmount + "/" + entity.path("amount").asLong(0) + ")"));
            notify(payment.getUserId(), "PAYMENT_REFUNDED", "Refund processed",
                    "A refund for your " + planName(payment.getPlanCode()) + " payment has been processed.",
                    null);
            // Email notification (non-blocking)
            sendBillingEmail(user ->
                    emailService.sendRefundProcessed(user.getEmail(), user.getFullName(),
                            planName(payment.getPlanCode())),
                    payment.getUserId());

            // Full refund revocation: immediately revoke subscription access.
            if (isFullRefund && payment.getSubscriptionId() != null) {
                revokeSubscriptionOnRefund(payment);
            } else if (!isFullRefund) {
                log.info("Partial refund ({} paise) on order {} — subscription untouched",
                        refundAmount, orderId);
            }
        });
        log.info("Webhook {} recorded refund for order {}", eventId, orderId);
    }

    /**
     * On a full refund, immediately revoke subscription access if the refunded
     * payment is the current, active, entitlement-granting payment. This avoids
     * incorrectly revoking access when a later renewal has already superseded
     * the refunded payment.
     */
    private void revokeSubscriptionOnRefund(Payment payment) {
        String userId = payment.getUserId();
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElse(null);
        if (subscription == null) {
            log.info("No subscription found for user {} — skipping revocation", userId);
            return;
        }

        // Only act if this subscription is for the same plan as the refunded payment
        // and is currently in a paid status.
        if (!subscription.getPlanCode().equals(payment.getPlanCode())) {
            log.info("Subscription plan {} does not match refunded payment plan {} — skipping",
                    subscription.getPlanCode(), payment.getPlanCode());
            return;
        }
        if (subscription.getStatus() != SubscriptionStatus.ACTIVE
                && subscription.getStatus() != SubscriptionStatus.PAST_DUE
                && subscription.getStatus() != SubscriptionStatus.TRIALING) {
            log.info("Subscription {} already {} — skipping revocation",
                    subscription.getId(), subscription.getStatus());
            return;
        }

        // Verify this is the most recent SUCCESS payment for this subscription.
        // If a newer SUCCESS payment exists, the user has already renewed and
        // this refund should not revoke their current access.
        boolean hasNewerSuccess = paymentRepository
                .findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .filter(p -> payment.getPlanCode().equals(p.getPlanCode()))
                .filter(p -> p.getPaidAt() != null && payment.getPaidAt() != null
                        && p.getPaidAt().isAfter(payment.getPaidAt()))
                .findFirst().isPresent();
        if (hasNewerSuccess) {
            log.info("Refunded payment {} is superseded by a newer payment — skipping revocation",
                    payment.getId());
            return;
        }

        // Revoke immediately: the money is back with the customer.
        subscription.setStatus(SubscriptionStatus.EXPIRED);
        subscription.setCurrentPeriodEnd(Instant.now());
        subscription.setCancelAtPeriodEnd(false);
        subscriptionRepository.save(subscription);

        auditLogService.record(userId, userId, AuditAction.SUBSCRIPTION_EXPIRED, AuditStatus.SUCCESS,
                "Subscription revoked due to full refund of payment " + payment.getProviderPaymentId());
        auditLogService.record(userId, userId, AuditAction.REFUND_PROCESSED, AuditStatus.SUCCESS,
                "Full refund revoked access to " + planName(subscription.getPlanCode()) + " plan");
        notify(userId, "SUBSCRIPTION_EXPIRED", "Plan downgraded due to refund",
                "Your " + planName(subscription.getPlanCode()) + " plan has been downgraded to Free due to a full refund."
                        + " Upgrade anytime to regain access.",
                null);
        sendBillingEmail(user ->
                emailService.sendSubscriptionExpired(user.getEmail(), user.getFullName()),
                userId);
        log.info("Subscription {} revoked (EXPIRED) due to full refund of payment {}",
                subscription.getId(), payment.getId());
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

    // ── Self-serve refund requests ────────────────────────────────

    @Transactional
    public RefundRequest submitRefundRequest(String userId, String paymentId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Please provide a reason for your refund request.");
        }
        if (reason.length() > 1000) {
            throw new IllegalArgumentException("Reason must be 1000 characters or fewer.");
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", paymentId));
        if (!payment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You can only request refunds for your own payments.");
        }
        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            throw new IllegalArgumentException("Refund requests are only available for successful payments.");
        }
        if (payment.getPaidAt() != null
                && payment.getPaidAt().isBefore(Instant.now().minus(refundWindowDays, ChronoUnit.DAYS))) {
            throw new IllegalArgumentException("Refund window (" + refundWindowDays
                    + " days) has passed for this payment.");
        }
        if (refundRequestRepository.existsByPaymentIdAndStatus(paymentId, RefundRequestStatus.PENDING)) {
            throw new IllegalArgumentException("You already have a pending refund request for this payment.");
        }

        RefundRequest request = refundRequestRepository.save(RefundRequest.builder()
                .userId(userId)
                .paymentId(paymentId)
                .reason(reason.trim())
                .status(RefundRequestStatus.PENDING)
                .build());

        auditLogService.record(userId, userId, AuditAction.REFUND_PROCESSED, AuditStatus.SUCCESS,
                "Refund request submitted for payment " + paymentId + " (" + formatINR(payment.getAmountPaise()) + ")");
        notify(userId, "REFUND_REQUEST_SUBMITTED", "Refund request received",
                "Your refund request for " + planName(payment.getPlanCode()) + " (" + formatINR(payment.getAmountPaise()) + ") has been submitted and is under review.",
                null);
        sendBillingEmail(user ->
                emailService.sendRefundRequestSubmitted(user.getEmail(), user.getFullName(),
                        planName(payment.getPlanCode()), payment.getAmountPaise()),
                userId);
        return request;
    }

    @Transactional(readOnly = true)
    public List<RefundRequest> getMyRefundRequests(String userId) {
        return refundRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminRefundRequestItem> listRefundRequests(int page, int size, String status) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        RefundRequestStatus statusFilter = parseRefundRequestStatus(status);
        Page<RefundRequest> result = (statusFilter != null)
                ? refundRequestRepository.findByStatusOrderByCreatedAtDesc(statusFilter, pageable)
                : refundRequestRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<AdminRefundRequestItem> items = result.getContent().stream()
                .map(rr -> {
                    Payment p = paymentRepository.findById(rr.getPaymentId()).orElse(null);
                    User u = userRepository.findById(rr.getUserId()).orElse(null);
                    return AdminRefundRequestItem.builder()
                            .id(rr.getId())
                            .userId(rr.getUserId())
                            .userName(u != null ? u.getFullName() : "Unknown")
                            .userEmail(u != null ? u.getEmail() : null)
                            .paymentId(rr.getPaymentId())
                            .planCode(p != null ? p.getPlanCode() : null)
                            .amountPaise(p != null ? p.getAmountPaise() : 0)
                            .currency(p != null ? p.getCurrency() : null)
                            .reason(rr.getReason())
                            .status(rr.getStatus().name())
                            .adminNote(rr.getAdminNote())
                            .reviewedAt(rr.getReviewedAt())
                            .createdAt(rr.getCreatedAt())
                            .build();
                })
                .toList();
        return PageResponse.<AdminRefundRequestItem>builder()
                .content(items)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build();
    }

    @Transactional
    public RefundRequest approveRefundRequest(String requestId, String adminId, String adminNote) {
        RefundRequest request = refundRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("RefundRequest", requestId));
        if (request.getStatus() != RefundRequestStatus.PENDING) {
            throw new IllegalArgumentException("Refund request is not in PENDING status.");
        }

        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment", request.getPaymentId()));

        // Call Razorpay Refund API — let the resulting refund.processed webhook
        // be the single source of truth for entitlement revocation.
        try {
            razorpayClient.createRefund(payment.getProviderPaymentId(),
                    adminNote != null ? adminNote : "Refund approved by admin");
        } catch (PaymentNotConfiguredException e) {
            throw e;
        } catch (Exception e) {
            log.error("Razorpay refund call failed for payment {} (request {})",
                    payment.getId(), requestId, e);
            throw new IllegalStateException("Failed to process refund with payment provider. Please try again.");
        }

        request.setStatus(RefundRequestStatus.APPROVED);
        request.setAdminNote(adminNote);
        request.setReviewedAt(Instant.now());
        request.setReviewedByAdminId(adminId);
        refundRequestRepository.save(request);

        auditLogService.record(adminId, request.getUserId(), AuditAction.REFUND_PROCESSED, AuditStatus.SUCCESS,
                "Refund request approved for payment " + payment.getId() + " (" + formatINR(payment.getAmountPaise()) + ")");
        notify(request.getUserId(), "REFUND_REQUEST_APPROVED", "Refund approved",
                "Your refund request for " + planName(payment.getPlanCode()) + " has been approved. The refund is being processed by the payment provider.",
                null);
        sendBillingEmail(user ->
                emailService.sendRefundRequestApproved(user.getEmail(), user.getFullName(),
                        planName(payment.getPlanCode()), adminNote),
                request.getUserId());
        return request;
    }

    @Transactional
    public RefundRequest rejectRefundRequest(String requestId, String adminId, String adminNote) {
        RefundRequest request = refundRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("RefundRequest", requestId));
        if (request.getStatus() != RefundRequestStatus.PENDING) {
            throw new IllegalArgumentException("Refund request is not in PENDING status.");
        }
        if (adminNote == null || adminNote.isBlank()) {
            throw new IllegalArgumentException("Please provide a note explaining why this refund was rejected.");
        }

        request.setStatus(RefundRequestStatus.REJECTED);
        request.setAdminNote(adminNote);
        request.setReviewedAt(Instant.now());
        request.setReviewedByAdminId(adminId);
        refundRequestRepository.save(request);

        Payment payment = paymentRepository.findById(request.getPaymentId()).orElse(null);
        String planLabel = payment != null ? planName(payment.getPlanCode()) : "your plan";

        auditLogService.record(adminId, request.getUserId(), AuditAction.REFUND_PROCESSED, AuditStatus.FAILURE,
                "Refund request rejected for payment " + request.getPaymentId() + ": " + adminNote);
        notify(request.getUserId(), "REFUND_REQUEST_REJECTED", "Refund request declined",
                "Your refund request for " + planLabel + " was declined. Reason: " + adminNote,
                null);
        sendBillingEmail(user ->
                emailService.sendRefundRequestRejected(user.getEmail(), user.getFullName(),
                        planLabel, adminNote),
                request.getUserId());
        return request;
    }

    private RefundRequestStatus parseRefundRequestStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return RefundRequestStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid refund request status filter: " + raw);
        }
    }

    private String formatINR(long paise) {
        return String.format("%s%,.0f", "\u20B9", paise / 100.0);
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

    /** Extracts the refund entity from a refund webhook payload. */
    private JsonNode refundEntity(JsonNode root) {
        return root.path("payload").path("refund").path("entity");
    }

    private RazorpayEventType parseEvent(String event) {
        return switch (event) {
            case "payment.captured" -> RazorpayEventType.PAYMENT_CAPTURED;
            case "order.paid" -> RazorpayEventType.ORDER_PAID;
            case "payment.failed" -> RazorpayEventType.PAYMENT_FAILED;
            case "refund.processed" -> RazorpayEventType.PAYMENT_REFUNDED;
            case "refund.created", "refund.failed" -> RazorpayEventType.UNKNOWN;
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
