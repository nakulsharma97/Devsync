package com.devsync.billing.repository;

import com.devsync.billing.entity.RefundRequest;
import com.devsync.billing.entity.RefundRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, String> {

    List<RefundRequest> findByUserIdOrderByCreatedAtDesc(String userId);

    Page<RefundRequest> findByStatusOrderByCreatedAtDesc(RefundRequestStatus status, Pageable pageable);

    Page<RefundRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<RefundRequest> findByPaymentId(String paymentId);

    Optional<RefundRequest> findByPaymentIdAndStatus(String paymentId, RefundRequestStatus status);

    boolean existsByPaymentIdAndStatus(String paymentId, RefundRequestStatus status);
}
