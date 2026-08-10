package com.devsync.activity.repository;

import com.devsync.activity.entity.Activity;
import com.devsync.activity.entity.ActivityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, String> {

    Page<Activity> findByProjectIdOrderByCreatedAtDesc(String projectId, Pageable pageable);

    Page<Activity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE " +
            "(:projectId IS NULL OR a.projectId = :projectId) AND " +
            "(:userId IS NULL OR a.userId = :userId) AND " +
            "(:type IS NULL OR a.activityType = :type) AND " +
            "(:from IS NULL OR a.createdAt >= :from) AND " +
            "(:to IS NULL OR a.createdAt <= :to)")
    Page<Activity> searchAdminActivities(@Param("projectId") String projectId,
                                         @Param("userId") String userId,
                                         @Param("type") ActivityType type,
                                         @Param("from") Instant from,
                                         @Param("to") Instant to,
                                         Pageable pageable);

    long countByCreatedAtAfter(Instant since);

    long countByActivityTypeInAndCreatedAtAfter(Collection<ActivityType> types, Instant since);

    long countByUserIdAndActivityType(String userId, ActivityType activityType);

    long countByProjectIdAndCreatedAtBetween(String projectId, Instant from, Instant to);

    long countByUserIdAndCreatedAtBetween(String userId, Instant from, Instant to);

    long countByActivityTypeAndCreatedAtBetween(ActivityType activityType, Instant from, Instant to);

    long countByCreatedAtBetween(Instant from, Instant to);

    /**
     * Aggregates activity counts per calendar day in a single query
     * (avoids one COUNT query per day). Returns rows of (date, count).
     */
    @Query("SELECT cast(a.createdAt as date) AS day, COUNT(a) FROM Activity a " +
            "WHERE a.createdAt >= :from AND a.createdAt < :to GROUP BY cast(a.createdAt as date)")
    List<Object[]> countGroupedByDay(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT cast(a.createdAt as date) AS day, COUNT(a) FROM Activity a " +
            "WHERE a.activityType = :type AND a.createdAt >= :from AND a.createdAt < :to " +
            "GROUP BY cast(a.createdAt as date)")
    List<Object[]> countGroupedByDayAndType(@Param("type") ActivityType type,
                                            @Param("from") Instant from,
                                            @Param("to") Instant to);

    @Query("SELECT cast(a.createdAt as date) AS day, COUNT(a) FROM Activity a " +
            "WHERE a.userId = :userId AND a.createdAt >= :from AND a.createdAt < :to " +
            "GROUP BY cast(a.createdAt as date)")
    List<Object[]> countGroupedByDayForUser(@Param("userId") String userId,
                                            @Param("from") Instant from,
                                            @Param("to") Instant to);

    @Query("SELECT a.createdAt FROM Activity a WHERE a.userId = :userId AND a.createdAt >= :since")
    List<Instant> findCreatedAtsSince(@Param("userId") String userId, @Param("since") Instant since);

}
