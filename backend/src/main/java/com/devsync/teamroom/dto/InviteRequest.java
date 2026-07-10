package com.devsync.teamroom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InviteRequest {
    @NotBlank(message = "User ID is required")
    private String userId;
}
