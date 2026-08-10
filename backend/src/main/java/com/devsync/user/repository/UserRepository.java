package com.devsync.user.repository;

import com.devsync.presence.PresenceStatus;
import com.devsync.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:value) OR LOWER(u.username) = LOWER(:value)")
    Optional<User> findByEmailOrUsername(@Param("value") String value);

    long countByEmail(String email);
    long countByUsername(String username);

    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    boolean existsByRole(User.Role role);
    long countByRole(User.Role role);

    long countByBlockedTrue();

    @Query("SELECT COUNT(u) FROM User u WHERE u.lastLoginAt >= :since")
    long countActiveUsers(@Param("since") Instant since);

    List<User> findTop5ByOrderByCreatedAtDesc();

    /** Active (non-deleted) users, newest first — avoids loading the whole table for the directory. */
    @Query("SELECT u FROM User u WHERE u.deleted = false ORDER BY u.createdAt DESC")
    List<User> findActiveUsers();

    @Query("SELECT u FROM User u WHERE u.id != :excludeUserId AND u.deleted = false AND " +
            "(LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<User> searchUsers(@Param("query") String query, @Param("excludeUserId") String excludeUserId);

    @Query("SELECT u FROM User u WHERE " +
            "(:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:role IS NULL OR u.role = :role) " +
            "AND (:status IS NULL OR " +
            "(:status = 'ACTIVE' AND u.blocked = false AND u.deleted = false) OR " +
            "(:status = 'BLOCKED' AND u.blocked = true) OR " +
            "(:status = 'DELETED' AND u.deleted = true)) " +
            "AND (:from IS NULL OR u.createdAt >= :from) " +
            "AND (:to IS NULL OR u.createdAt <= :to)")
    Page<User> searchAdminUsers(@Param("search") String search,
                                @Param("role") User.Role role,
                                @Param("status") String status,
                                @Param("from") Instant from,
                                @Param("to") Instant to,
                                Pageable pageable);

    /**
     * Number of admins that are not deleted and not blocked. Used to protect the
     * last active admin from demotion, blocking or deletion.
     */
    long countByRoleAndDeletedFalseAndBlockedFalse(User.Role role);

    long countByPresenceStatus(PresenceStatus presenceStatus);

    long countByCreatedAtBetween(Instant from, Instant to);

    /** Aggregates user registrations per calendar day in a single query. */
    @Query("SELECT cast(u.createdAt as date) AS day, COUNT(u) FROM User u " +
            "WHERE u.createdAt >= :from AND u.createdAt < :to GROUP BY cast(u.createdAt as date)")
    List<Object[]> countGroupedByDay(@Param("from") Instant from, @Param("to") Instant to);

}
