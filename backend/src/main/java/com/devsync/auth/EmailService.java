package com.devsync.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

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
        mailSender.send(message);
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
        mailSender.send(message);
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
        mailSender.send(message);
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
        mailSender.send(message);
    }
}
