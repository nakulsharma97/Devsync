package com.devsync.billing.repository;

import com.devsync.billing.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Payment> findTopByProviderOrderIdOrderByCreatedAtDesc(String providerOrderId);

    boolean existsByProviderPaymentId(String providerPaymentId);

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
