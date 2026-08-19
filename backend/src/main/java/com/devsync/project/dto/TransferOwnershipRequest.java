package com.devsync.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TransferOwnershipRequest {
    /** The existing project member who should become the new owner. */
    @NotBlank(message = "A target member is required")
    private String userId;
}
