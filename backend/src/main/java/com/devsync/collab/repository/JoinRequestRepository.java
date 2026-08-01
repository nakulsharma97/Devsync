package com.devsync.collab.repository;

import com.devsync.collab.entity.JoinRequest;
import com.devsync.collab.entity.JoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JoinRequestRepository extends JpaRepository<JoinRequest, String> {

    List<JoinRequest> findByProjectIdOrderByCreatedAtDesc(String projectId);

    List<JoinRequest> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, JoinRequestStatus status);

    Optional<JoinRequest> findByProjectIdAndUserId(String projectId, String userId);

    boolean existsByProjectIdAndUserId(String projectId, String userId);

    long countByProjectIdAndStatus(String projectId, JoinRequestStatus status);
}
