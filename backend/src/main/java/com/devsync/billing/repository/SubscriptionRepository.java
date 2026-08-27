package com.devsync.billing.repository;

import com.devsync.billing.entity.Subscription;
import com.devsync.billing.entity.SubscriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, String> {

    Optional<Subscription> findByUserId(String userId);

    Optional<Subscription> findByProviderSubscriptionId(String providerSubscriptionId);

    List<Subscription> findByStatusIn(List<SubscriptionStatus> statuses);

    @Query("SELECT s FROM Subscription s WHERE s.status IN :statuses AND s.currentPeriodEnd < :now")
    List<Subscription> findExpired(@Param("statuses") List<SubscriptionStatus> statuses, @Param("now") Instant now);

    @Query("SELECT s FROM Subscription s JOIN User u ON s.userId = u.id WHERE " +
            "(:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(s.planCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:planCode IS NULL OR s.planCode = :planCode) " +
            "AND (:status IS NULL OR s.status = :status)")
    Page<Subscription> searchAdmin(@Param("search") String search,
                                   @Param("planCode") String planCode,
                                   @Param("status") SubscriptionStatus status,
                                   Pageable pageable);

    long countByStatus(SubscriptionStatus status);

    long countByPlanCode(String planCode);

    long countByStatusIn(List<SubscriptionStatus> statuses);

    /**
     * Subscriptions that will expire between {@code from} and {@code to},
     * used by the scheduled reminder job to find users who need a renewal
     * reminder. Only paid statuses are relevant.
     */
    @Query("SELECT s FROM Subscription s WHERE s.status IN :statuses " +
            "AND s.currentPeriodEnd > :from AND s.currentPeriodEnd <= :to")
    List<Subscription> findExpiringBetween(
            @Param("statuses") List<SubscriptionStatus> statuses,
            @Param("from") Instant from, @Param("to") Instant to);
}
