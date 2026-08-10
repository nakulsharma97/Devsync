package com.devsync.report.repository;

import com.devsync.report.ReportEntityType;
import com.devsync.report.ReportReason;
import com.devsync.report.ReportStatus;
import com.devsync.report.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, String> {

    boolean existsByReporterIdAndEntityTypeAndEntityId(String reporterId, ReportEntityType entityType, String entityId);

    @Query("SELECT r FROM Report r WHERE " +
            "(:status IS NULL OR r.status = :status) " +
            "AND (:reason IS NULL OR r.reason = :reason) " +
            "AND (:entityType IS NULL OR r.entityType = :entityType) " +
            "AND (:search IS NULL OR r.reporterId IN " +
            "    (SELECT u.id FROM User u WHERE LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "     OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "     OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')))) " +
            "AND (:from IS NULL OR r.createdAt >= :from) " +
            "AND (:to IS NULL OR r.createdAt <= :to)")
    Page<Report> searchAdminReports(@Param("status") ReportStatus status,
                                    @Param("reason") ReportReason reason,
                                    @Param("entityType") ReportEntityType entityType,
                                    @Param("search") String search,
                                    @Param("from") Instant from,
                                    @Param("to") Instant to,
                                    Pageable pageable);

    long countByStatus(ReportStatus status);

    long countByCreatedAtBetween(Instant from, Instant to);

    /** Aggregates report counts per calendar day in a single query. */
    @Query("SELECT cast(r.createdAt as date) AS day, COUNT(r) FROM Report r " +
            "WHERE r.createdAt >= :from AND r.createdAt < :to GROUP BY cast(r.createdAt as date)")
    List<Object[]> countGroupedByDay(@Param("from") Instant from, @Param("to") Instant to);

}
