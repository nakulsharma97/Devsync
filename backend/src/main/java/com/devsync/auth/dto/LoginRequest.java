package com.devsync.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    /**
     * Accepts either the registered email address or the username — the service
     * detects which one it is. Kept as {@code email} for backward compatibility
     * with existing clients.
     */
    @NotBlank(message = "Email or username is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}
