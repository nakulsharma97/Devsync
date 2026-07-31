package com.devsync.report.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModerateReportRequest {

    @NotBlank(message = "Action is required")
    private String action; // BLOCK_USER | ARCHIVE_PROJECT | HIDE_POST | ...

    private String value; // optional payload (e.g. visibility for SET_VISIBILITY)
}
