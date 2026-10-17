package com.devsync.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class EmailService {

    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final JavaMailSender mailSender;
    private final String fromEmail;
    private final boolean smtpConfigured;
    private final String brevoApiKey;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Email goes out over Brevo's HTTPS API when BREVO_API_KEY is set (required on
     * hosts that block outbound SMTP ports, e.g. Render free tier). Otherwise it
     * falls back to SMTP via MAIL_USERNAME / MAIL_PASSWORD.
     * MAIL_FROM must be a sender verified in Brevo (defaults to MAIL_USERNAME).
     */
    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.username:}") String smtpUser,
                        @Value("${BREVO_API_KEY:}") String brevoApiKey,
                        @Value("${MAIL_FROM:}") String mailFrom) {
        this.mailSender = mailSender;
        this.brevoApiKey = brevoApiKey == null ? "" : brevoApiKey.trim();
        String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom.trim() : smtpUser;
        this.fromEmail = from;
        boolean hasApi = !this.brevoApiKey.isEmpty() && from != null && !from.isBlank();
        boolean hasSmtp = smtpUser != null && !smtpUser.isBlank();
        this.smtpConfigured = hasApi || hasSmtp;
        if (!this.smtpConfigured) {
            log.warn("Email not configured (set BREVO_API_KEY + MAIL_FROM, or MAIL_USERNAME + MAIL_PASSWORD) - emails will not be sent");
        } else if (hasApi) {
            log.info("Email delivery: Brevo HTTPS API (sender {})", from);
        } else {
            log.info("Email delivery: SMTP");
        }
    }

    private boolean useApi() {
        return !brevoApiKey.isEmpty() && fromEmail != null && !fromEmail.isBlank();
    }

    /** Single delivery point: HTTPS API when configured, SMTP otherwise. */
    private void deliver(SimpleMailMessage message) throws Exception {
        if (!useApi()) {
            mailSender.send(message);
            return;
        }
        String to = message.getTo() == null || message.getTo().length == 0 ? "" : message.getTo()[0];
        String body = objectMapper.writeValueAsString(Map.of(
                "sender", Map.of("email", fromEmail, "name", "DevSync"),
                "to", List.of(Map.of("email", to)),
                "subject", message.getSubject() == null ? "" : message.getSubject(),
                "textContent", message.getText() == null ? "" : message.getText()));
        HttpRequest request = HttpRequest.newBuilder(URI.create(BREVO_URL))
                .timeout(Duration.ofSeconds(10))
                .header("api-key", brevoApiKey)
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("Brevo API returned HTTP " + response.statusCode() + ": " + response.body());
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
            deliver(message);
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
            deliver(message);
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

    /**
     * Send confirmation that a refund request was received.
     */
    public void sendRefundRequestSubmitted(String to, String fullName, String planName, long amountPaise) {
        String amount = String.format("%s%,.0f", currencySymbol("INR"), amountPaise / 100.0);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Refund request received — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "We've received your refund request for the " + planName + " plan (" + amount + ").\n\n"
            + "Our team will review your request. You'll be notified once a decision is made.\n\n"
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send notification that a refund request was approved.
     */
    public void sendRefundRequestApproved(String to, String fullName, String planName, String adminNote) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Refund approved — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Your refund request for the " + planName + " plan has been approved.\n\n"
            + "The refund is being processed by the payment provider and will appear on your statement within 5-10 business days.\n\n"
            + (adminNote != null && !adminNote.isBlank() ? "Note from our team: " + adminNote + "\n\n" : "")
            + "— The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send a renewal reminder before subscription expires.
     */
    public void sendRenewalReminder(String to, String fullName, String planName, String expiryDate, int daysLeft) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Your " + planName + " subscription expires in " + daysLeft + " days");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "Your " + planName + " subscription will expire on " + expiryDate + ".\n\n"
            + "Renew now to continue using premium features without interruption.\n\n"
            + "You can renew from Settings \u2192 Billing.\n\n"
            + "\u2014 The DevSync Team"
        );
        trySend(message);
    }

    /**
     * Send notification that a refund request was rejected.
     */
    public void sendRefundRequestRejected(String to, String fullName, String planName, String adminNote) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Refund request declined — " + planName + " plan");
        message.setText(
            "Hi " + fullName + ",\n\n"
            + "We're sorry, but your refund request for the " + planName + " plan has been declined.\n\n"
            + "Reason: " + adminNote + "\n\n"
            + "If you have questions, please contact our support team.\n\n"
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