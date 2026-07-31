package com.devsync.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateVisibilityRequest {
    @NotBlank(message = "Visibility is required")
    private String visibility;
}
