package com.devsync.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateReviewRequest {

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer rating;

    @Size(max = 120, message = "Title must be at most 120 characters")
    private String title;

    @NotBlank(message = "Review text is required")
    @Size(max = 2000, message = "Review must be at most 2000 characters")
    private String comment;

    private String category;
}
