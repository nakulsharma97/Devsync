package com.devsync.message.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendMessageRequest {
    private String roomId;
    private String receiverId;

    @NotBlank(message = "Message content is required")
    private String content;

    private String messageType;
    private boolean systemMessage;
    private String attachmentId;
}
