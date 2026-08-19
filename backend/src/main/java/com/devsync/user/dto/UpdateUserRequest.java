package com.devsync.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String fullName;

    @Size(min = 3, max = 30, message = "Username must be 3-30 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_.-]+$", message = "Username can only contain letters, numbers, dots, hyphens and underscores")
    private String username;

    private String avatarUrl;

    @Size(max = 500, message = "Bio must be at most 500 characters")
    private String bio;

    @Size(max = 100, message = "Job title must be at most 100 characters")
    private String jobTitle;

    @Size(max = 100, message = "Company name must be at most 100 characters")
    private String company;

    @Size(max = 100, message = "Location must be at most 100 characters")
    private String location;

    @Size(max = 2048, message = "URL must be at most 2048 characters")
    @Pattern(regexp = "^(https?://.+)?$", message = "URL must start with http:// or https://")
    private String githubUrl;

    @Size(max = 2048, message = "URL must be at most 2048 characters")
    @Pattern(regexp = "^(https?://.+)?$", message = "URL must start with http:// or https://")
    private String twitterUrl;

    @Size(max = 2048, message = "URL must be at most 2048 characters")
    @Pattern(regexp = "^(https?://.+)?$", message = "URL must start with http:// or https://")
    private String websiteUrl;
}
