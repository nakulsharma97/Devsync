package com.devsync.billing;

import com.devsync.attachment.repository.FileAttachmentRepository;
import com.devsync.billing.entity.Plan;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Central, server-side feature/limit enforcement. Controllers and services
 * call these methods instead of duplicating plan checks — a malicious request
 * can never supply its own plan/status and receive paid features.
 *
 * Limits are read from the {@link Plan} catalog (configurable in the database)
 * and enforced atomically: limit-checked writes lock the owner's user row
 * (SELECT ... FOR UPDATE) so two concurrent requests cannot race past a cap.
 */
@Service
@RequiredArgsConstructor
public class EntitlementService {

    private final PlanService planService;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final FileAttachmentRepository attachmentRepository;
    private final UserRepository userRepository;

    // ── Private project limit ─────────────────────────────────────

    public long countPrivateProjects(String userId) {
        return projectRepository.countByOwnerIdAndVisibilityAndDeletedFalse(
                userId, Project.ProjectVisibility.PRIVATE);
    }

    public Integer privateProjectLimit(String userId) {
        return planService.getEffectivePlan(userId).getPrivateProjectLimit();
    }

    public void assertCanCreatePrivateProject(String userId) {
        // Serialize per-user: two concurrent creations cannot both pass the cap.
        userRepository.findByIdForUpdate(userId);
        Plan plan = planService.getEffectivePlan(userId);
        Integer limit = plan.getPrivateProjectLimit();
        if (limit == null) return; // unlimited (ENTERPRISE)
        long current = countPrivateProjects(userId);
        if (current >= limit) {
            throw new FeatureLimitException("PRIVATE_PROJECT_LIMIT",
                    "Your " + plan.getName() + " plan has reached its private project limit ("
                            + limit + "). Upgrade to Pro to create more private projects.");
        }
    }

    // ── Member limit (based on the project OWNER's plan) ──────────

    public int memberLimit(String ownerId) {
        return planService.getEffectivePlan(ownerId).getMembersPerProject();
    }

    /**
     * Ensures the project's owner's plan allows one more member. Locks the
     * owner row so concurrent invites/approvals/joins cannot exceed the cap.
     */
    public void assertCanAddMember(String projectId) {
        String ownerId = projectRepository.findById(projectId)
                .orElseThrow(() -> new com.devsync.common.ResourceNotFoundException("Project", projectId))
                .getOwnerId();
        userRepository.findByIdForUpdate(ownerId);
        Plan plan = planService.getEffectivePlan(ownerId);
        long current = memberRepository.countByProjectId(projectId);
        if (current >= plan.getMembersPerProject()) {
            throw new FeatureLimitException("MEMBER_LIMIT",
                    "This project has reached its member limit (" + plan.getMembersPerProject()
                            + ") under the " + plan.getName() + " plan. Upgrade the owner's plan to add more members.");
        }
    }

    // ── Storage limit ─────────────────────────────────────────────

    public long storageUsed(String userId) {
        return attachmentRepository.sumSizeByUploaderId(userId);
    }

    public long storageLimit(String userId) {
        return planService.getEffectivePlan(userId).getStorageBytes();
    }

    public void assertCanUpload(String userId, long fileSize) {
        Plan plan = planService.getEffectivePlan(userId);
        long used = storageUsed(userId);
        if (used + fileSize > plan.getStorageBytes()) {
            long limitMb = plan.getStorageBytes() / 1024 / 1024;
            throw new FeatureLimitException("STORAGE_LIMIT",
                    "You have reached your storage limit (" + limitMb + " MB on the "
                            + plan.getName() + " plan). Delete files or upgrade to Pro for more storage.");
        }
    }

    // ── Advanced analytics ────────────────────────────────────────

    public boolean canUseAdvancedAnalytics(String userId) {
        return planService.getEffectivePlan(userId).isAdvancedAnalytics();
    }

    public void assertAdvancedAnalytics(String userId) {
        if (!canUseAdvancedAnalytics(userId)) {
            throw new FeatureLimitException("ADVANCED_ANALYTICS",
                    "Advanced analytics are available on the Pro plan. Upgrade to unlock them.");
        }
    }

    // ── Aggregate usage (Billing page) ────────────────────────────

    /** Max active members across the user's owned projects (single GROUP BY query). */
    @Transactional(readOnly = true)
    public long maxMembersInOwnedProjects(String userId) {
        List<Project> owned = projectRepository.findByOwnerId(userId);
        if (owned.isEmpty()) return 0;
        List<String> ids = owned.stream().map(Project::getId).toList();
        return memberRepository.countMembersByProjectIdIn(ids).stream()
                .mapToLong(row -> (Long) row[1])
                .max()
                .orElse(0L);
    }
}
