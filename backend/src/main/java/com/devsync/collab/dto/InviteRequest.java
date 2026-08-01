package com.devsync.collab.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InviteRequest {

    @NotBlank(message = "Username or email is required")
    private String usernameOrEmail;

    private String message;
}
