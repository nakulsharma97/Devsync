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
