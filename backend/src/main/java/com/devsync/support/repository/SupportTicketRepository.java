package com.devsync.support.repository;

import com.devsync.support.SupportTicketPriority;
import com.devsync.support.SupportTicketStatus;
import com.devsync.support.entity.SupportTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {

    Page<SupportTicket> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    long countByStatus(SupportTicketStatus status);

    long countByUserIdAndStatusNotIn(String userId, java.util.List<SupportTicketStatus> closedStatuses);

    @Query("SELECT t FROM SupportTicket t WHERE " +
           "(:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority) " +
           "AND (:assignedTo IS NULL OR t.assignedTo = :assignedTo) " +
           "AND (:from IS NULL OR t.createdAt >= :from) " +
           "AND (:to IS NULL OR t.createdAt <= :to) " +
           "AND (:search IS NULL OR LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<SupportTicket> searchAdminTickets(
            @Param("status") SupportTicketStatus status,
            @Param("priority") SupportTicketPriority priority,
            @Param("assignedTo") String assignedTo,
            @Param("search") String search,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    @Query("SELECT t FROM SupportTicket t WHERE t.userId = :userId " +
           "AND (:search IS NULL OR LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<SupportTicket> searchUserTickets(
            @Param("userId") String userId,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT MAX(CAST(SUBSTRING(t.ticketNumber, 5) AS long)) FROM SupportTicket t")
    Long findMaxTicketNumber();
}
