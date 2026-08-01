package com.devsync.collab.repository;

import com.devsync.collab.entity.InvitationStatus;
import com.devsync.collab.entity.ProjectInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, String> {

    List<ProjectInvitation> findByProjectId(String projectId);

    List<ProjectInvitation> findByReceiverIdOrderByCreatedAtDesc(String receiverId);

    List<ProjectInvitation> findByReceiverIdAndStatusOrderByCreatedAtDesc(String receiverId, InvitationStatus status);

    Optional<ProjectInvitation> findFirstByProjectIdAndReceiverIdAndStatus(
            String projectId, String receiverId, InvitationStatus status);

    boolean existsByProjectIdAndReceiverIdAndStatus(String projectId, String receiverId, InvitationStatus status);
}
