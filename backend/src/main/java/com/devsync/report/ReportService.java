package com.devsync.report;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Comment;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.dto.CreateReportRequest;
import com.devsync.report.dto.ReportResponse;
import com.devsync.report.entity.Report;
import com.devsync.report.repository.ReportRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final MessageRepository messageRepository;

    /**
     * Submits a report. Validates the reported entity exists and that the
     * reporter has not already reported the same entity.
     */
    @Transactional
    public ReportResponse createReport(String reporterId, CreateReportRequest request) {
        ReportEntityType entityType = parseEntityType(request.getEntityType());
        String entityId = request.getEntityId().trim();
        validateEntityExists(entityType, entityId);

        if (reportRepository.existsByReporterIdAndEntityTypeAndEntityId(reporterId, entityType, entityId)) {
            throw new IllegalArgumentException("You have already reported this " + label(entityType));
        }

        ReportReason reason = parseReason(request.getReason());
        Report report = reportRepository.save(Report.builder()
                .reporterId(reporterId)
                .entityType(entityType)
                .entityId(entityId)
                .reason(reason)
                .description(request.getDescription())
                .status(ReportStatus.PENDING)
                .build());

        return ReportResponse.builder()
                .id(report.getId())
                .entityType(report.getEntityType().name())
                .entityId(report.getEntityId())
                .reason(report.getReason().name())
                .description(report.getDescription())
                .status(report.getStatus().name())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private void validateEntityExists(ReportEntityType type, String entityId) {
        switch (type) {
            case USER -> {
                if (!userRepository.existsById(entityId)) throw new ResourceNotFoundException("User", entityId);
            }
            case PROJECT -> {
                if (!projectRepository.existsById(entityId)) throw new ResourceNotFoundException("Project", entityId);
            }
            case POST -> {
                if (!postRepository.existsById(entityId)) throw new ResourceNotFoundException("Post", entityId);
            }
            case COMMENT -> {
                if (!commentRepository.existsById(entityId)) throw new ResourceNotFoundException("Comment", entityId);
            }
            case MESSAGE -> {
                if (!messageRepository.existsById(entityId)) throw new ResourceNotFoundException("Message", entityId);
            }
        }
    }

    private ReportEntityType parseEntityType(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Entity type is required");
        }
        try {
            return ReportEntityType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid entity type: " + raw);
        }
    }

    private ReportReason parseReason(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Reason is required");
        }
        try {
            return ReportReason.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid reason: " + raw);
        }
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
}
