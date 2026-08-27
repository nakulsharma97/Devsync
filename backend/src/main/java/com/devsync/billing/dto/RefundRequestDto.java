package com.devsync.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefundRequestDto {
    @NotBlank(message = "paymentId is required")
    private String paymentId;

    @NotBlank(message = "reason is required")
    private String reason;
}
