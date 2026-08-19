package com.devsync.audit.repository;

import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditLog;
import com.devsync.audit.entity.AuditStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Set;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    @Query("SELECT a FROM AuditLog a " +
            "WHERE (:action IS NULL OR a.action = :action) " +
            "AND (:performedBy IS NULL OR a.performedBy = :performedBy) " +
            "AND (:targetUser IS NULL OR a.targetUser = :targetUser) " +
            "AND (:status IS NULL OR a.status = :status) " +
            "AND (:from IS NULL OR a.createdAt >= :from) " +
            "AND (:to IS NULL OR a.createdAt <= :to) " +
            "AND (:search IS NULL OR a.performedBy LIKE %:search% OR a.targetUser LIKE %:search% " +
            "OR a.details LIKE %:search%)" +
            "AND (:userSearchIds IS NULL OR a.performedBy IN :userSearchIds OR a.targetUser IN :userSearchIds)")
    Page<AuditLog> searchAdminLogs(@Param("action") AuditAction action,
                                   @Param("performedBy") String performedBy,
                                   @Param("targetUser") String targetUser,
                                   @Param("status") AuditStatus status,
                                   @Param("from") Instant from,
                                   @Param("to") Instant to,
                                   @Param("search") String search,
                                   @Param("userSearchIds") Set<String> userSearchIds,
                                   Pageable pageable);
}
