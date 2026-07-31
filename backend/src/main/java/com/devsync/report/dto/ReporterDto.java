package com.devsync.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporterDto {
    private String id;
    private String fullName;
    private String email;
    private String username;
    private String avatarUrl;
}
