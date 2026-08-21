package com.devsync.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromEmail;
    private final boolean smtpConfigured;

    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.username:}") String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
        this.smtpConfigured = fromEmail != null && !fromEmail.isBlank();
        if (!this.smtpConfigured) {
            log.warn("SMTP not configured (MAIL_USERNAME is empty) — emails will not be sent");
        }
    }

    /** Returns true when SMTP credentials are configured and emails can be sent. */
    public boolean isSmtpConfigured() {
        return smtpConfigured;
    }

    /**
     * Send a message. Returns true on success, false on transient failure.
     * Throws {@link EmailNotConfiguredException} when SMTP credentials are
     * missing — callers that need to propagate the failure (OTP, password
     * reset) should catch this and surface a user-friendly error.
     */
    private void send(SimpleMailMessage message) {
        if (!smtpConfigured) {
            throw new EmailNotConfiguredException(
                "Email service is not configured. Please set MAIL_USERNAME and MAIL_PASSWORD.");
        }
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", message.getTo(), e.getMessage());
            throw new EmailNotConfiguredException(
                "Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Try to send a best-effort email (welcome, billing notifications).
     * Failures are logged but never propagated — these emails are not
     * critical to the request flow.
     */
    private void trySend(SimpleMailMessage message) {
        if (!smtpConfigured) return;
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", message.getTo(), e.getMessage());
        }
    }

    /** Thrown when SMTP is not configured or sending fails. */
    public static class EmailNotConfiguredException extends RuntimeException {
        public EmailNotConfiguredException(String message) {
            super(message);
        }
    }

    /**
     * Send an OTP code to the user's email for passwordless login.
     */
    public void sendOtpEmail(String to, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Your DevSync verification code");
        message.setText(
            "Hello,\n\n"
            + "Your DevSync verification code is:\n\n"
            + "  " + otp + "\n\n"
            + "This code expires in 10 minutes.\n\n"
            + "If you didn't request this code, you can safely ignore this email.\n\n"
            + "— The DevSync Team"
        );
        send(message);
    }

    /**
     * Send a password reset link. The token in the link is single-use and
     * expires; only its hash is stored server-side.
     */
    public void sendPasswordResetEmail(String to, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Reset your DevSync password");
        message.setText(
            "Hello,\n\n"
            + "We received a request to reset your DevSync password. Click the link below to choose a new one:\n\n"
            + "  " + resetLink + "\n\n"
            + "This link expires in 15 minutes and can only be used once.\n\n"
            + "If you didn't request this, you can safely ignore this email — your password won't change.\n\n"
            + "— The DevSync Team"
        );
        send(message);
    }

    /**
     * Send an email verification link.
     */
    public void sendVerificationEmail(String to, String verifyLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Verify your DevSync email");
        message.setText(
            "Hello,\n\n"
            + "Verify your DevSync email address by clicking the link below:\n\n"
            + "  " + verifyLink + "\n\n"
            + "This link expires in 15 minutes and can only be used once.\n\n"
            + "If you didn't request this, you can safely ignore this email.\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send a welcome email after registration.
     */
    public void sendWelcomeEmail(String to, String fullName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Welcome to DevSync!");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Welcome to DevSync! You're now part of a community of developers "
            + "building amazing things together.\n\n"
            + "Get started:\n"
            + "- Create your first project\n"
            + "- Connect with other developers\n"
            + "- Set up your developer profile\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    // ── Billing emails ──────────────────────────────────────────

    /**
     * Send a payment receipt after a successful payment.
     */
    public void sendPaymentReceipt(String to, String fullName, String planName,
                                    long amountPaise, String currency, String paymentId) {
        String amount = String.format("%s%,.0f", currencySymbol(currency), amountPaise / 100.0);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Payment received — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Your payment has been received successfully.\n\n"
            + "  Plan:    " + planName + "\n"
            + "  Amount:  " + amount + "\n"
            + "  Payment: " + paymentId + "\n\n"
            + "Your subscription is now active. Enjoy the extra features!\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send a subscription renewal confirmation.
     */
    public void sendSubscriptionRenewal(String to, String fullName, String planName,
                                         long amountPaise, String currency, String paymentId) {
        String amount = String.format("%s%,.0f", currencySymbol(currency), amountPaise / 100.0);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Subscription renewed — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Your " + planName + " subscription has been renewed.\n\n"
            + "  Amount:  " + amount + "\n"
            + "  Payment: " + paymentId + "\n\n"
            + "Thank you for staying with DevSync!\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send a payment failure notification.
     */
    public void sendPaymentFailed(String to, String fullName, String planName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Payment failed — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Your payment for the " + planName + " plan could not be completed.\n\n"
            + "Please update your payment method to avoid interruption to your subscription.\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send a subscription cancellation confirmation.
     */
    public void sendSubscriptionCancelled(String to, String fullName, String planName, String periodEnd) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Subscription cancelled — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Your " + planName + " subscription has been cancelled.\n\n"
            + "You will keep access to " + planName + " features until " + periodEnd + ".\n"
            + "After that, your account will move to the Free plan.\n\n"
            + "You can resubscribe at any time from Settings → Billing.\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send a subscription expired notification.
     */
    public void sendSubscriptionExpired(String to, String fullName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Subscription expired");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Your DevSync subscription has expired. You are now on the Free plan.\n\n"
            + "Upgrade anytime from Settings → Billing to regain access to premium features.\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send a refund processed notification.
     */
    public void sendRefundProcessed(String to, String fullName, String planName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Refund processed — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "A refund for your " + planName + " subscription payment has been processed.\n"
            + "The amount will be credited to your original payment method.\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    private String currencySymbol(String currency) {
        if ("INR".equalsIgnoreCase(currency)) return "₹";
        if ("USD".equalsIgnoreCase(currency)) return "$";
        if ("EUR".equalsIgnoreCase(currency)) return "€";
        return currency + " ";
    }
}
