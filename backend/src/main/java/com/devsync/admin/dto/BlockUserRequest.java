package com.devsync.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optional body for block/unblock operations. The reason is stored in the
 * audit log only - it is never exposed through any user-facing API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockUserRequest {
    private String reason;
}
