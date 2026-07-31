package com.devsync.user.repository;

import com.devsync.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    long countByEmail(String email);
    long countByUsername(String username);

    long countByBlockedTrue();

    @Query("SELECT COUNT(u) FROM User u WHERE u.lastLoginAt >= :since")
    long countActiveUsers(@Param("since") Instant since);

    List<User> findTop5ByOrderByCreatedAtDesc();

    @Query("SELECT u FROM User u WHERE u.id != :excludeUserId AND (LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<User> searchUsers(@Param("query") String query, @Param("excludeUserId") String excludeUserId);
}
