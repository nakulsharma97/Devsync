package com.devsync.auth.repository;

import com.devsync.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserIdAndRevokedAtIsNull(String userId);

    List<RefreshToken> findByFamilyId(String familyId);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :now WHERE rt.userId = :userId AND rt.revokedAt IS NULL")
    void revokeAllForUser(@Param("userId") String userId, @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :cutoff")
    void deleteExpired(@Param("cutoff") Instant cutoff);
}
