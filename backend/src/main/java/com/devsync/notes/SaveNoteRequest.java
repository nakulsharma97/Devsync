package com.devsync.notes;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SaveNoteRequest {
    @Min(value = 0, message = "version must be non-negative")
    private long version;

    @NotBlank(message = "yjsState is required")
    private String yjsState;
}
