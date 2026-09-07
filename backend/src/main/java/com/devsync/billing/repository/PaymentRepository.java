package com.devsync.billing.repository;

import com.devsync.billing.entity.Payment;
import com.devsync.billing.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Payment> findTopByProviderOrderIdOrderByCreatedAtDesc(String providerOrderId);

    boolean existsByProviderPaymentId(String providerPaymentId);

    Optional<Payment> findByProviderPaymentId(String providerPaymentId);

    /**
     * Pessimistic-write lock on the payment row, keyed by provider payment id.
     * Used by webhook handlers that perform a read-check-update sequence
     * (e.g. status == PENDING → set SUCCESS) so two concurrent requests
     * for the same payment serialize instead of both passing the guard.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.providerPaymentId = :providerPaymentId")
    Optional<Payment> findByProviderPaymentIdWithLock(@Param("providerPaymentId") String providerPaymentId);

    /**
     * Pessimistic-write lock on the payment row, keyed by provider order id
     * (newest first). Used by webhook handlers that locate the payment by
     * order id and then transition its status.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.providerOrderId = :providerOrderId ORDER BY p.createdAt DESC")
    Optional<Payment> findTopByProviderOrderIdOrderByCreatedAtDescWithLock(@Param("providerOrderId") String providerOrderId);

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.amountPaise), 0) FROM Payment p WHERE p.status = 'SUCCESS' AND p.paidAt >= :from")
    long sumSuccessfulAmountSince(@Param("from") Instant from);
}
