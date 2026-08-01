package com.devsync.presence.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PresenceUpdateRequest {
    @NotBlank(message = "Status is required")
    private String status;
}
