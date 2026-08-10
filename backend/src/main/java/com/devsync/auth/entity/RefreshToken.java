package com.devsync.auth.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens", indexes = {
        @Index(name = "idx_refresh_user", columnList = "user_id"),
        @Index(name = "idx_refresh_family", columnList = "family_id"),
        @Index(name = "idx_refresh_expires", columnList = "expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    /** SHA-256 hex of the refresh token — the raw token is never stored. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /** Groups rotated tokens so a stolen token can revoke the whole chain. */
    @Column(name = "family_id", nullable = false, length = 36)
    private String familyId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    /** Hash of the token that replaced this one (rotation chain). */
    @Column(name = "replaced_by", length = 64)
    private String replacedBy;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(Instant.now());
    }
}
