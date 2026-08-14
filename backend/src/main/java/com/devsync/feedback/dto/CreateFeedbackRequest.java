package com.devsync.feedback.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateFeedbackRequest {

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Feedback message is required")
    @Size(max = 4000, message = "Feedback must be at most 4000 characters")
    private String message;

    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer rating;
}
