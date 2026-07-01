package com.devsync.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserProfileRequest {
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;

    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @Size(max = 500, message = "Bio must not exceed 500 characters")
    private String bio;

    private String location;
    private String githubUsername;
    private String linkedinLink;
    private String portfolioWebsite;
}
