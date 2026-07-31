package com.devsync.report.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewReportRequest {

    @NotBlank(message = "Status is required")
    private String status; // UNDER_REVIEW | RESOLVED | REJECTED
}
