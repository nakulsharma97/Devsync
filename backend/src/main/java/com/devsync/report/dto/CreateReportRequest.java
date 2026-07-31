package com.devsync.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateReportRequest {

    @NotBlank(message = "Entity type is required")
    private String entityType; // USER | PROJECT | POST | COMMENT | MESSAGE

    @NotBlank(message = "Entity id is required")
    private String entityId;

    @NotBlank(message = "Reason is required")
    private String reason; // SPAM | HARASSMENT | ... | OTHER

    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;
}
