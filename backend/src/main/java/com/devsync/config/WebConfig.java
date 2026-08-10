package com.devsync.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    // Uploaded files are NO LONGER served from /uploads/**. Downloads go through
    // the authenticated /api/attachments/{id}/download endpoint (AttachmentController),
    // which enforces project membership, IDOR protection and traversal guards.
    //
    // NOTE: CORS is configured once in CorsConfig (CorsFilter) from
    // app.cors.allowed-origins. Do not add a second CORS mapping here — a
    // wildcard originPatterns + allowCredentials(true) combination would
    // silently allow any origin to make credentialed requests.
}
