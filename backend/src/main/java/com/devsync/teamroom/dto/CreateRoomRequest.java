package com.devsync.teamroom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateRoomRequest {
    @NotBlank(message = "Room name is required")
    private String name;

    private String projectId;
    private String description;
}
