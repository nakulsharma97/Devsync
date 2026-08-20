package com.devsync.billing.repository;

import com.devsync.billing.entity.Payment;
import com.devsync.billing.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Payment> findTopByProviderOrderIdOrderByCreatedAtDesc(String providerOrderId);

    boolean existsByProviderPaymentId(String providerPaymentId);

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.amountPaise), 0) FROM Payment p WHERE p.status = 'SUCCESS' AND p.paidAt >= :from")
    long sumSuccessfulAmountSince(@Param("from") Instant from);
}
