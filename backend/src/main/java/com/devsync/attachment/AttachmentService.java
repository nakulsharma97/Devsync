package com.devsync.attachment;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.attachment.dto.AttachmentResponse;
import com.devsync.attachment.entity.AttachmentContext;
import com.devsync.attachment.entity.FileAttachment;
import com.devsync.attachment.repository.FileAttachmentRepository;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private static final String IMAGE_EXTENSIONS = "png,jpg,jpeg,gif,webp,svg,bmp";
    private static final String DOC_EXTENSIONS = "pdf,doc,docx,txt,md,zip,xlsx,xls,csv";

    @Value("${app.upload.max-size:10485760}")
    private long maxSize;

    private final FileAttachmentRepository attachmentRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final ActivityService activityService;

    @Transactional
    public AttachmentResponse upload(MultipartFile file, String contextType, String contextId,
                                     String projectId, String uploaderId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File exceeds the maximum allowed size (" + (maxSize / 1024 / 1024) + "MB)");
        }
        String originalName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        validateType(originalName);

        AttachmentContext context = parseContext(contextType);
        String storedName = fileStorageService.store(file, originalName);
        String url = "/uploads/" + storedName;

        FileAttachment attachment = attachmentRepository.save(FileAttachment.builder()
                .uploaderId(uploaderId)
                .projectId(projectId)
                .contextType(context)
                .contextId(contextId)
                .originalName(originalName)
                .storedName(storedName)
                .contentType(file.getContentType())
                .size(file.getSize())
                .url(url)
                .build());
        activityService.record(uploaderId, projectId, ActivityType.FILE_UPLOADED,
                "File uploaded", originalName, url);
        return toResponse(attachment, userRepository.findById(uploaderId).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> listByContext(String contextType, String contextId) {
        AttachmentContext context = parseContext(contextType);
        List<FileAttachment> attachments =
                attachmentRepository.findByContextTypeAndContextId(context.name(), contextId);
        if (attachments.isEmpty()) return List.of();
        Set<String> userIds = attachments.stream().map(FileAttachment::getUploaderId).collect(Collectors.toSet());
        Map<String, User> userMap = userIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        return attachments.stream()
                .map(a -> toResponse(a, userMap.get(a.getUploaderId())))
                .toList();
    }

    /**
     * Batch-resolve attachments by id (used by MessageService to avoid N+1).
     */
    public Map<String, AttachmentResponse> batchByIds(Set<String> ids) {
        if (ids.isEmpty()) return Collections.emptyMap();
        List<FileAttachment> attachments = attachmentRepository.findAllById(ids);
        Set<String> uploaderIds = attachments.stream().map(FileAttachment::getUploaderId).collect(Collectors.toSet());
        Map<String, User> userMap = uploaderIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(uploaderIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        return attachments.stream()
                .collect(Collectors.toMap(FileAttachment::getId,
                        a -> toResponse(a, userMap.get(a.getUploaderId()))));
    }

    public AttachmentResponse toResponse(FileAttachment attachment, User uploader) {
        return AttachmentResponse.builder()
                .id(attachment.getId())
                .uploaderId(attachment.getUploaderId())
                .uploaderName(uploader != null ? uploader.getFullName() : "Unknown")
                .uploaderAvatar(uploader != null ? uploader.getAvatarUrl() : null)
                .projectId(attachment.getProjectId())
                .contextType(attachment.getContextType() != null ? attachment.getContextType().name() : null)
                .contextId(attachment.getContextId())
                .fileName(attachment.getOriginalName())
                .contentType(attachment.getContentType())
                .size(attachment.getSize())
                .url(attachment.getUrl())
                .createdAt(attachment.getCreatedAt())
                .build();
    }

    public String getStoredName(String attachmentId) {
        FileAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        return attachment.getStoredName();
    }

    private AttachmentContext parseContext(String contextType) {
        if (contextType == null || contextType.isBlank()) {
            throw new IllegalArgumentException("contextType is required (MESSAGE, POST, FEED_COMMENT, TASK_COMMENT)");
        }
        try {
            return AttachmentContext.valueOf(contextType.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid contextType: " + contextType);
        }
    }

    private void validateType(String fileName) {
        String lower = fileName.toLowerCase();
        int dot = lower.lastIndexOf('.');
        String ext = dot >= 0 ? lower.substring(dot + 1) : "";
        if ((IMAGE_EXTENSIONS + "," + DOC_EXTENSIONS).contains(ext.toLowerCase())) return;
        throw new IllegalArgumentException("Unsupported file type: " + ext + ". Allowed: images, pdf, docx, txt, md, zip, xlsx, csv");
    }
}
