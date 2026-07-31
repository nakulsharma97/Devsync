package com.devsync.report;

import com.devsync.admin.AdminService;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Comment;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.notification.NotificationService;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.dto.AdminReportDetail;
import com.devsync.report.dto.AdminReportListItem;
import com.devsync.report.dto.AdminReportStats;
import com.devsync.report.dto.ReporterDto;
import com.devsync.report.entity.Report;
import com.devsync.report.repository.ReportRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportAdminService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final MessageRepository messageRepository;
    private final AdminService adminService;
    private final NotificationService notificationService;

    /**
     * Paginated, searchable, filterable admin report list.
     * Filters: status, reason, entityType, reporter search (name/email/username), date range.
     * Batch-loads reporters and entity titles - no N+1.
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminReportListItem> getReportsPage(int page, int size, String sortBy, String sortDir,
                                                            String search, String status, String reason,
                                                            String entityType, Instant from, Instant to) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String sortField = normalizeSortField(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));

        ReportStatus statusFilter = parseStatusFilter(status);
        ReportReason reasonFilter = parseReasonFilter(reason);
        ReportEntityType typeFilter = parseEntityTypeFilter(entityType);
        String searchFilter = (search == null || search.isBlank()) ? null : search.trim();

        Page<Report> reports = reportRepository.searchAdminReports(
                statusFilter, reasonFilter, typeFilter, searchFilter, from, to, pageable);

        List<Report> content = reports.getContent();
        Map<String, User> reporterMap = reporterMap(content);
        Map<String, String> entityTitles = entityTitles(content);

        List<AdminReportListItem> items = content.stream()
                .map(r -> toListItem(r, reporterMap.get(r.getReporterId()), entityTitles.get(r.getEntityId())))
                .toList();

        return PageResponse.<AdminReportListItem>builder()
                .content(items)
                .page(reports.getNumber())
                .size(reports.getSize())
                .totalElements(reports.getTotalElements())
                .totalPages(reports.getTotalPages())
                .last(reports.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public AdminReportDetail getReportDetail(String reportId) {
        Report report = getReport(reportId);
        User reporter = userRepository.findById(report.getReporterId()).orElse(null);
        String entityTitle = resolveEntityTitle(report.getEntityType(), report.getEntityId());
        String ownerName = resolveEntityOwnerName(report.getEntityType(), report.getEntityId());
        User reviewer = report.getReviewedBy() != null
                ? userRepository.findById(report.getReviewedBy()).orElse(null)
                : null;

        return toDetail(report, reporter, reviewer, entityTitle, ownerName);
    }

    @Transactional(readOnly = true)
    public AdminReportStats getStats() {
        return AdminReportStats.builder()
                .total(reportRepository.count())
                .pending(reportRepository.countByStatus(ReportStatus.PENDING))
                .underReview(reportRepository.countByStatus(ReportStatus.UNDER_REVIEW))
                .resolved(reportRepository.countByStatus(ReportStatus.RESOLVED))
                .rejected(reportRepository.countByStatus(ReportStatus.REJECTED))
                .build();
    }

    /**
     * Moves a report through its workflow. Notifies the reporter when the report
     * reaches a terminal state (RESOLVED / REJECTED).
     */
    @Transactional
    public AdminReportDetail reviewReport(String reportId, String requestedStatus, String adminId) {
        Report report = getReport(reportId);
        ReportStatus newStatus = parseReviewStatus(requestedStatus);

        report.setStatus(newStatus);
        report.setReviewedBy(adminId);
        report.setReviewedAt(Instant.now());
        reportRepository.save(report);

        if (newStatus == ReportStatus.RESOLVED || newStatus == ReportStatus.REJECTED) {
            User admin = userRepository.findById(adminId).orElse(null);
            notificationService.createNotification(
                    report.getReporterId(),
                    "REPORT",
                    "Your report has been reviewed",
                    "Your report about a " + label(report.getEntityType())
                            + " was " + newStatus.name().toLowerCase() + " by our moderation team.",
                    adminId,
                    admin != null ? admin.getFullName() : "Admin",
                    admin != null ? admin.getAvatarUrl() : null,
                    report.getId(),
                    "report",
                    "/reports");
        }

        return getReportDetail(reportId);
    }

    /**
     * Executes a direct moderation action against the reported entity.
     * Reuses existing AdminService methods where available (block/unblock/delete user,
     * archive/delete/visibility project, delete post) and repository-level flags otherwise.
     */
    @Transactional
    public AdminReportDetail moderate(String reportId, String requestedAction, String value, String adminId) {
        Report report = getReport(reportId);
        ModerationAction action = parseAction(requestedAction);
        validateActionForType(action, report.getEntityType());
        String entityId = report.getEntityId();

        switch (action) {
            case BLOCK_USER -> adminService.setUserBlocked(entityId, true, adminId);
            case UNBLOCK_USER -> adminService.setUserBlocked(entityId, false, adminId);
            case DELETE_USER -> adminService.deleteUser(entityId, adminId);
            case ARCHIVE_PROJECT -> adminService.archiveProject(entityId, adminId);
            case DELETE_PROJECT -> adminService.deleteProject(entityId, adminId);
            case SET_VISIBILITY -> adminService.setProjectVisibility(entityId, value, adminId);
            case DELETE_POST -> adminService.deletePost(entityId);
            case HIDE_POST -> setPostHidden(entityId, true);
            case RESTORE_POST -> setPostHidden(entityId, false);
            case DELETE_COMMENT -> commentRepository.deleteById(entityId);
            case RESTORE_COMMENT -> setCommentHidden(entityId, false);
            case DELETE_MESSAGE -> messageRepository.deleteById(entityId);
            case HIDE_MESSAGE -> setMessageHidden(entityId, true);
        }

        return getReportDetail(reportId);
    }

    private void setPostHidden(String postId, boolean hidden) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        post.setHidden(hidden);
        postRepository.save(post);
    }

    private void setCommentHidden(String commentId, boolean hidden) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));
        comment.setHidden(hidden);
        commentRepository.save(comment);
    }

    private void setMessageHidden(String messageId, boolean hidden) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
        message.setHidden(hidden);
        messageRepository.save(message);
    }

    private void validateActionForType(ModerationAction action, ReportEntityType type) {
        boolean valid = switch (type) {
            case USER -> action == ModerationAction.BLOCK_USER
                    || action == ModerationAction.UNBLOCK_USER
                    || action == ModerationAction.DELETE_USER;
            case PROJECT -> action == ModerationAction.ARCHIVE_PROJECT
                    || action == ModerationAction.DELETE_PROJECT
                    || action == ModerationAction.SET_VISIBILITY;
            case POST -> action == ModerationAction.DELETE_POST
                    || action == ModerationAction.HIDE_POST
                    || action == ModerationAction.RESTORE_POST;
            case COMMENT -> action == ModerationAction.DELETE_COMMENT
                    || action == ModerationAction.RESTORE_COMMENT;
            case MESSAGE -> action == ModerationAction.DELETE_MESSAGE
                    || action == ModerationAction.HIDE_MESSAGE;
        };
        if (!valid) {
            throw new IllegalArgumentException("Action " + action + " is not valid for " + label(type) + " reports");
        }
    }

    private Report getReport(String reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", reportId));
    }

    private Map<String, User> reporterMap(List<Report> reports) {
        Set<String> ids = reports.stream().map(Report::getReporterId).collect(Collectors.toSet());
        if (ids.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    /**
     * Batch-loads display titles for all reported entities on the page
     * (one query per entity type - no N+1).
     */
    private Map<String, String> entityTitles(List<Report> reports) {
        if (reports.isEmpty()) return Collections.emptyMap();

        Map<String, String> titles = new HashMap<>();
        Set<String> userIds = reports.stream()
                .filter(r -> r.getEntityType() == ReportEntityType.USER)
                .map(Report::getEntityId).collect(Collectors.toSet());
        Set<String> projectIds = reports.stream()
                .filter(r -> r.getEntityType() == ReportEntityType.PROJECT)
                .map(Report::getEntityId).collect(Collectors.toSet());
        Set<String> postIds = reports.stream()
                .filter(r -> r.getEntityType() == ReportEntityType.POST)
                .map(Report::getEntityId).collect(Collectors.toSet());
        Set<String> commentIds = reports.stream()
                .filter(r -> r.getEntityType() == ReportEntityType.COMMENT)
                .map(Report::getEntityId).collect(Collectors.toSet());
        Set<String> messageIds = reports.stream()
                .filter(r -> r.getEntityType() == ReportEntityType.MESSAGE)
                .map(Report::getEntityId).collect(Collectors.toSet());

        if (!userIds.isEmpty()) {
            userRepository.findAllById(userIds)
                    .forEach(u -> titles.put(u.getId(), u.getFullName()));
        }
        if (!projectIds.isEmpty()) {
            projectRepository.findAllById(projectIds)
                    .forEach(p -> titles.put(p.getId(), p.getName()));
        }
        if (!postIds.isEmpty()) {
            postRepository.findAllById(postIds)
                    .forEach(p -> titles.put(p.getId(), snippet(p.getContent())));
        }
        if (!commentIds.isEmpty()) {
            commentRepository.findAllById(commentIds)
                    .forEach(c -> titles.put(c.getId(), snippet(c.getContent())));
        }
        if (!messageIds.isEmpty()) {
            messageRepository.findAllById(messageIds)
                    .forEach(m -> titles.put(m.getId(), snippet(m.getContent())));
        }
        return titles;
    }

    private String resolveEntityTitle(ReportEntityType type, String entityId) {
        return switch (type) {
            case USER -> userRepository.findById(entityId).map(User::getFullName).orElse("Unknown user");
            case PROJECT -> projectRepository.findById(entityId).map(Project::getName).orElse("Unknown project");
            case POST -> postRepository.findById(entityId).map(p -> snippet(p.getContent())).orElse("Unknown post");
            case COMMENT -> commentRepository.findById(entityId).map(c -> snippet(c.getContent())).orElse("Unknown comment");
            case MESSAGE -> messageRepository.findById(entityId).map(m -> snippet(m.getContent())).orElse("Unknown message");
        };
    }

    private String resolveEntityOwnerName(ReportEntityType type, String entityId) {
        return switch (type) {
            case USER -> userRepository.findById(entityId).map(User::getFullName).orElse(null);
            case PROJECT -> projectRepository.findById(entityId)
                    .flatMap(p -> userRepository.findById(p.getOwnerId())).map(User::getFullName).orElse(null);
            case POST -> postRepository.findById(entityId)
                    .flatMap(p -> userRepository.findById(p.getUserId())).map(User::getFullName).orElse(null);
            case COMMENT -> commentRepository.findById(entityId)
                    .flatMap(c -> userRepository.findById(c.getUserId())).map(User::getFullName).orElse(null);
            case MESSAGE -> messageRepository.findById(entityId)
                    .flatMap(m -> userRepository.findById(m.getSenderId())).map(User::getFullName).orElse(null);
        };
    }

    private String resolveEntityOwnerId(ReportEntityType type, String entityId) {
        return switch (type) {
            case USER -> entityId;
            case PROJECT -> projectRepository.findById(entityId).map(Project::getOwnerId).orElse(null);
            case POST -> postRepository.findById(entityId).map(Post::getUserId).orElse(null);
            case COMMENT -> commentRepository.findById(entityId).map(Comment::getUserId).orElse(null);
            case MESSAGE -> messageRepository.findById(entityId).map(Message::getSenderId).orElse(null);
        };
    }

    private AdminReportListItem toListItem(Report r, User reporter, String entityTitle) {
        return AdminReportListItem.builder()
                .id(r.getId())
                .reporter(toReporter(reporter, r.getReporterId()))
                .entityType(r.getEntityType().name())
                .entityId(r.getEntityId())
                .entityTitle(entityTitle != null ? entityTitle : "Unknown")
                .reason(r.getReason().name())
                .status(r.getStatus().name())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private AdminReportDetail toDetail(Report r, User reporter, User reviewer, String entityTitle, String ownerName) {
        return AdminReportDetail.builder()
                .id(r.getId())
                .reporter(toReporter(reporter, r.getReporterId()))
                .entityType(r.getEntityType().name())
                .entityId(r.getEntityId())
                .entityTitle(entityTitle != null ? entityTitle : "Unknown")
                .entityOwnerId(resolveEntityOwnerId(r.getEntityType(), r.getEntityId()))
                .entityOwnerName(ownerName)
                .reason(r.getReason().name())
                .description(r.getDescription())
                .status(r.getStatus().name())
                .reviewedBy(r.getReviewedBy())
                .reviewedByName(reviewer != null ? reviewer.getFullName() : null)
                .reviewedAt(r.getReviewedAt())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    private ReporterDto toReporter(User reporter, String fallbackId) {
        if (reporter == null) {
            return ReporterDto.builder().id(fallbackId).fullName("Unknown").build();
        }
        return ReporterDto.builder()
                .id(reporter.getId())
                .fullName(reporter.getFullName())
                .email(reporter.getEmail())
                .username(reporter.getUsername())
                .avatarUrl(reporter.getAvatarUrl())
                .build();
    }

    private String snippet(String content) {
        if (content == null) return "";
        String trimmed = content.trim().replaceAll("\\s+", " ");
        return trimmed.length() > 60 ? trimmed.substring(0, 60) + "..." : trimmed;
    }

    private String label(ReportEntityType type) {
        return switch (type) {
            case USER -> "user";
            case PROJECT -> "project";
            case POST -> "post";
            case COMMENT -> "comment";
            case MESSAGE -> "message";
        };
    }

    private ReportStatus parseStatusFilter(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return ReportStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status filter: " + raw);
        }
    }

    private ReportReason parseReasonFilter(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return ReportReason.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid reason filter: " + raw);
        }
    }

    private ReportEntityType parseEntityTypeFilter(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return ReportEntityType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid entity type filter: " + raw);
        }
    }

    private ReportStatus parseReviewStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }
        try {
            ReportStatus status = ReportStatus.valueOf(raw.trim().toUpperCase());
            if (status == ReportStatus.PENDING) {
                throw new IllegalArgumentException("Cannot set a report back to PENDING");
            }
            return status;
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Cannot")) throw e;
            throw new IllegalArgumentException("Invalid status: " + raw);
        }
    }

    private ModerationAction parseAction(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Action is required");
        }
        try {
            return ModerationAction.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid moderation action: " + raw);
        }
    }

    private String normalizeSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) return "createdAt";
        return switch (sortBy.toLowerCase()) {
            case "status" -> "status";
            case "reason" -> "reason";
            case "entitytype" -> "entityType";
            case "updatedat", "updated" -> "updatedAt";
            default -> "createdAt";
        };
    }
}
