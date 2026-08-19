package com.devsync.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReplySupportTicketRequest {

    @NotBlank(message = "Message is required")
    @Size(max = 5000, message = "Message must be at most 5000 characters")
    private String message;

    private boolean internalNote = false;
}
