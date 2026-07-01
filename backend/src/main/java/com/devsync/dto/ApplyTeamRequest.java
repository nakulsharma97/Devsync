package com.devsync.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ApplyTeamRequest {
    @Size(max = 100, message = "Role must not exceed 100 characters")
    private String roleApplied;

    @Size(max = 2000, message = "Message must not exceed 2000 characters")
    private String message;
}
