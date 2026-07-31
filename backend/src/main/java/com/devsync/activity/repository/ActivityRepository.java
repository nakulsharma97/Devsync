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
}
