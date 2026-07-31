package com.devsync.activity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityUserDto {
    private String id;
    private String fullName;
    private String username;
    private String avatarUrl;
}
