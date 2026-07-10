package com.devsync.teamroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamRoomResponse {
    private String id;
    private String name;
    private String projectId;
    private String projectName;
    private String description;
    private String createdBy;
    private long participantCount;
    private List<ParticipantDto> participants;
    private Instant createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantDto {
        private String userId;
        private String fullName;
        private String email;
        private String avatarUrl;
        private String invitedBy;
    }
}
