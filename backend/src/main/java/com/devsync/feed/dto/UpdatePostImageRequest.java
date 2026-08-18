package com.devsync.feed.dto;

import lombok.Data;

@Data
public class UpdatePostImageRequest {
    /** Absolute /api path of the uploaded attachment, or null to clear. */
    private String imageUrl;
}
