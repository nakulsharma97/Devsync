package com.devsync.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String fullName;

    @Size(min = 3, max = 30, message = "Username must be 3-30 characters")
    private String username;

    private String avatarUrl;
    private String bio;

    @Size(max = 100, message = "Job title must be at most 100 characters")
    private String jobTitle;

    @Size(max = 100, message = "Company name must be at most 100 characters")
    private String company;

    @Size(max = 100, message = "Location must be at most 100 characters")
    private String location;

    private String githubUrl;
    private String twitterUrl;
    private String websiteUrl;
}
