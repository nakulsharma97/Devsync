package com.devsync.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckoutRequest {
    @NotBlank(message = "planCode is required")
    private String planCode;
}
