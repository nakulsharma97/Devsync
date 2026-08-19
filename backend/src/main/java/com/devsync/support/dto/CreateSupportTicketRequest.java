package com.devsync.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSupportTicketRequest {

    @NotBlank(message = "Subject is required")
    @Size(max = 200, message = "Subject must be at most 200 characters")
    private String subject;

    @NotBlank(message = "Description is required")
    @Size(max = 5000, message = "Description must be at most 5000 characters")
    private String description;

    @Size(max = 50, message = "Category must be at most 50 characters")
    private String category;

    @Size(max = 10, message = "Priority must be at most 10 characters")
    private String priority;
}
