package com.devsync.billing;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.auth.EmailService;
import com.devsync.billing.entity.Subscription;
import com.devsync.billing.entity.SubscriptionStatus;
import com.devsync.billing.repository.SubscriptionRepository;
import com.devsync.billing.repository.PlanRepository;
import com.devsync.billing.entity.Plan;
import com.devsync.notification.NotificationService;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Proactive subscription lifecycle management. Runs as a scheduled background
 * job to handle two scenarios that the lazy/explicit check in
 * {@link PlanService#expireIfDue} may miss when users are inactive:
 *
 * <ol>
 *   <li><b>Renewal reminders</b> — emails users 2 and 3 days before their
 *       subscription expires, with deduplication via the
 *       {@code lastReminderSentAt} column on {@link Subscription}.</li>
 *   <li><b>Expired subscriptions</b> — proactively expires subscriptions whose
 *       billing period has ended, even if the user never logs in.  This is
 *       idempotent: already-expired or already-cancelled rows are skipped.</li>
 * </ol>
 *
 * <p><b>Multi-instance consideration:</b> If the application is deployed on
 * multiple instances, this job will run on each instance simultaneously.  The
 * operations are idempotent (reminder dedup via timestamp, expiry via status
 * check), so concurrent execution is safe but may result in duplicate email
 * sends within the dedup window.  For stricter dedup at scale, a distributed
 * lock (e.g. ShedLock, Quartz, or a database advisory lock) could be added.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    /** Paid statuses that have an actual billing period to expire. */
    private static final List<SubscriptionStatus> PAID_STATUSES = List.of(
            SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE);

    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    // ── Renewal reminders ─────────────────────────────────────────

    /**
     * Every 6 hours, send renewal reminders for subscriptions expiring in
     * 2–3 days.  Deduplication: only sends if {@code lastReminderSentAt}
     * is null or older than 24 hours.
     */
    @Scheduled(fixedRate = 6 * 60 * 60 * 1000) // every 6 hours
    @Transactional
    public void sendExpiryReminders() {
        Instant now = Instant.now();
        Instant from = now;                                // expires after now
        Instant to   = now.plus(3, ChronoUnit.DAYS);      // within 3 days

        List<Subscription> expiring = subscriptionRepository
                .findExpiringBetween(PAID_STATUSES, from, to);

        int sent = 0;
        for (Subscription sub : expiring) {
            try {
                // Dedup: skip if a reminder was already sent in the last 24 hours
                if (sub.getLastReminderSentAt() != null
                        && sub.getLastReminderSentAt().isAfter(now.minus(1, ChronoUnit.DAYS))) {
                    continue;
                }

                long daysLeft = ChronoUnit.DAYS.between(now, sub.getCurrentPeriodEnd());
                if (daysLeft < 1) daysLeft = 1;

                // Build the email
                User user = userRepository.findById(sub.getUserId()).orElse(null);
                if (user == null || user.getEmail() == null) {
                    log.warn("Cannot send reminder — user {} not found or no email", sub.getUserId());
                    continue;
                }

                String planLabel = planName(sub.getPlanCode());
                String expiryDate = sub.getCurrentPeriodEnd().toString();

                emailService.sendRenewalReminder(
                        user.getEmail(), user.getFullName(), planLabel, expiryDate, (int) daysLeft);

                // In-app notification
                try {
                    notificationService.createNotification(sub.getUserId(),
                            "SUBSCRIPTION_RENEWAL_REMINDER",
                            "Your " + planLabel + " plan expires soon",
                            "Your " + planLabel + " subscription expires in " + daysLeft
                                    + " day" + (daysLeft == 1 ? "" : "s")
                                    + ". Renew to keep premium features.",
                            null, "DevSync", null, null, "billing", "/settings/billing");
                } catch (Exception e) {
                    log.warn("Reminder notification failed for user {}", sub.getUserId());
                }

                // Mark as sent to prevent duplicates
                sub.setLastReminderSentAt(now);
                subscriptionRepository.save(sub);

                sent++;
                log.info("Renewal reminder sent to user {} for {} plan (expires in {} days)",
                        sub.getUserId(), planLabel, daysLeft);
            } catch (Exception e) {
                log.error("Failed to send renewal reminder for subscription {} (user {})",
                        sub.getId(), sub.getUserId(), e);
                // Continue processing other subscriptions
            }
        }

        if (sent > 0) {
            log.info("Subscription renewal reminders: {} sent", sent);
        }
    }

    // ── Expire overdue subscriptions ──────────────────────────────

    /**
     * Every 6 hours, proactively expire subscriptions whose billing period
     * has ended.  This mirrors the lazy expiry in {@link PlanService#expireIfDue}
     * but fires even when the user is inactive.  Operations are idempotent:
     * already-EXPIRED or already-CANCELLED rows are skipped.
     */
    @Scheduled(fixedRate = 6 * 60 * 60 * 1000) // every 6 hours
    @Transactional
    public void processExpiredSubscriptions() {
        Instant now = Instant.now();

        List<Subscription> expired = subscriptionRepository.findExpired(PAID_STATUSES, now);

        int processed = 0;
        for (Subscription sub : expired) {
            try {
                // Idempotent: skip if already expired or cancelled
                if (sub.getStatus() == SubscriptionStatus.EXPIRED
                        || sub.getStatus() == SubscriptionStatus.CANCELLED) {
                    continue;
                }

                String planLabel = planName(sub.getPlanCode());
                String oldStatus = sub.getStatus().name();

                sub.setStatus(SubscriptionStatus.EXPIRED);
                sub.setCancelAtPeriodEnd(false);
                sub.setCurrentPeriodEnd(now);
                subscriptionRepository.save(sub);

                auditLogService.record(sub.getUserId(), sub.getUserId(),
                        AuditAction.SUBSCRIPTION_EXPIRED, AuditStatus.SUCCESS,
                        "Subscription expired (scheduled job) — " + planLabel
                                + " (was " + oldStatus + ")");

                // In-app notification
                try {
                    notificationService.createNotification(sub.getUserId(),
                            "SUBSCRIPTION_EXPIRED",
                            "Your " + planLabel + " plan has expired",
                            "Your " + planLabel + " subscription has expired. You are now on the Free plan."
                                    + " Upgrade anytime to regain access to premium features.",
                            null, "DevSync", null, null, "billing", "/settings/billing");
                } catch (Exception e) {
                    log.warn("Expiry notification failed for user {}", sub.getUserId());
                }

                // Email notification
                try {
                    User user = userRepository.findById(sub.getUserId()).orElse(null);
                    if (user != null && user.getEmail() != null) {
                        emailService.sendSubscriptionExpired(user.getEmail(), user.getFullName());
                    }
                } catch (Exception e) {
                    log.warn("Expiry email failed for user {}", sub.getUserId());
                }

                processed++;
                log.info("Subscription {} (user {}) expired via scheduled job — downgraded to FREE",
                        sub.getId(), sub.getUserId());
            } catch (Exception e) {
                log.error("Failed to process expired subscription {} (user {})",
                        sub.getId(), sub.getUserId(), e);
                // Continue processing other subscriptions
            }
        }

        if (processed > 0) {
            log.info("Expired subscriptions processed: {}", processed);
        }
    }

    private String planName(String planCode) {
        return planRepository.findByCode(planCode)
                .map(Plan::getName)
                .orElse(planCode);
    }
}
