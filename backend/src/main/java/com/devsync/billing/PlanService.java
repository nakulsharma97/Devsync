package com.devsync.billing;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.billing.entity.Plan;
import com.devsync.billing.entity.Subscription;
import com.devsync.billing.entity.SubscriptionStatus;
import com.devsync.billing.repository.PlanRepository;
import com.devsync.billing.repository.SubscriptionRepository;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Resolves the effective plan for a user. Backend is the single source of
 * truth: no active subscription ⇒ FREE. Paid entitlements expire lazily — a
 * subscription whose period has ended is flipped to EXPIRED (with audit +
 * notification) on the next entitlement lookup, so stale rows can never grant
 * paid features.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlanService {

    private static final List<SubscriptionStatus> PAID_STATUSES = List.of(
            SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE);

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    /** Small catalog — cache with no expiry; invalidation is unnecessary because
     *  plans are config-edited rarely and reads are cheap. */
    private final ConcurrentMap<String, Plan> planCache = new ConcurrentHashMap<>();

    @Transactional
    public Plan getEffectivePlan(String userId) {
        expireIfDue(userId);
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElse(null);
        if (subscription == null || !PAID_STATUSES.contains(subscription.getStatus())) {
            return getPlan(PlanCode.FREE);
        }
        return getPlan(subscription.getPlanCode());
    }

    /** True when the user currently holds an active paid subscription. */
    @Transactional(readOnly = true)
    public boolean hasPaidSubscription(String userId) {
        return subscriptionRepository.findByUserId(userId)
                .filter(s -> PAID_STATUSES.contains(s.getStatus()))
                .filter(s -> s.getCurrentPeriodEnd() == null || !s.getCurrentPeriodEnd().isBefore(Instant.now()))
                .isPresent();
    }

    public Plan getPlan(String code) {
        Plan cached = planCache.get(code);
        if (cached != null) return cached;
        Plan plan = planRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Plan", code));
        planCache.put(code, plan);
        return plan;
    }

    /**
     * Lazy expiry: a paid subscription whose period has ended loses its paid
     * status on the next entitlement check. Data is never deleted on downgrade.
     */
    private void expireIfDue(String userId) {
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElse(null);
        if (subscription == null || !PAID_STATUSES.contains(subscription.getStatus())) {
            return;
        }
        if (subscription.getCurrentPeriodEnd() == null
                || !subscription.getCurrentPeriodEnd().isBefore(Instant.now())) {
            return;
        }
        subscription.setStatus(SubscriptionStatus.EXPIRED);
        subscriptionRepository.save(subscription);
        auditLogService.record(userId, userId, AuditAction.SUBSCRIPTION_EXPIRED, AuditStatus.SUCCESS,
                "Plan " + subscription.getPlanCode() + " expired");
        try {
            notificationService.createNotification(userId, "SUBSCRIPTION_EXPIRED", "Plan expired",
                    "Your " + subscription.getPlanCode() + " plan has expired. You're now on the Free plan.",
                    null, "DevSync", null, null, "billing", "/settings/billing");
        } catch (Exception e) {
            log.warn("Expiry notification failed for user {}", userId);
        }
    }
}
