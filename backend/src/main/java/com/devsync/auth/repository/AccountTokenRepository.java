package com.devsync.auth.repository;

import com.devsync.auth.entity.AccountToken;
import com.devsync.auth.entity.AccountTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AccountTokenRepository extends JpaRepository<AccountToken, String> {

    Optional<AccountToken> findByTokenHash(String tokenHash);

    Optional<AccountToken> findByUserIdAndTokenType(String userId, AccountTokenType type);

    @Modifying
    @Query("DELETE FROM AccountToken t WHERE t.userId = :userId AND t.tokenType = :type")
    void deleteByUserIdAndType(@Param("userId") String userId, @Param("type") AccountTokenType type);
}
