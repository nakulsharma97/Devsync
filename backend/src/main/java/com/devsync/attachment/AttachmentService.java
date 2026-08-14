package com.devsync.attachment;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.attachment.dto.AttachmentResponse;
import com.devsync.billing.EntitlementService;
import com.devsync.attachment.entity.AttachmentContext;
import com.devsync.attachment.entity.FileAttachment;
import com.devsync.attachment.repository.FileAttachmentRepository;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Comment;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "svg", "bmp");
    private static final Set<String> DOC_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt", "md", "zip", "xlsx", "xls", "csv");

    /** Number of leading bytes sniffed to verify the real content type. */
    private static final int SNIFF_LENGTH = 512;

    /** Magic-byte signatures used to verify content matches the claimed extension. */
    private static final byte[] SIG_PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] SIG_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] SIG_GIF = {'G', 'I', 'F', '8'};
    private static final byte[] SIG_BMP = {'B', 'M'};
    private static final byte[] SIG_PDF = {'%', 'P', 'D', 'F'};
    private static final byte[] SIG_ZIP = {'P', 'K', 0x03, 0x04};
    private static final byte[] SIG_OLE = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
    private static final byte[] SIG_ELF = {0x7F, 'E', 'L', 'F'};
    private static final byte[] SIG_MZ = {'M', 'Z'};

    @Value("${app.upload.max-size:10485760}")
    private long maxSize;

    private final FileAttachmentRepository attachmentRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final ActivityService activityService;
    private final ProjectMemberRepository projectMemberRepository;
    private final MessageRepository messageRepository;
    private final ProjectRepository projectRepository;
    private final TeamRoomRepository roomRepository;
    private final TeamRoomParticipantRepository participantRepository;
    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final EntitlementService entitlementService;

    @Transactional
    public AttachmentResponse upload(MultipartFile file, String contextType, String contextId,
                                     String projectId, String uploaderId, boolean isAdmin) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File exceeds the maximum allowed size (" + (maxSize / 1024 / 1024) + "MB)");
        }
        String originalName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        AttachmentContext context = parseContext(contextType);

        // Authorize FIRST and derive the effective project server-side from the
        // context — projectId/contextId from the client are never trusted.
        String effectiveProjectId = authorizeUpload(uploaderId, isAdmin, context, contextId, projectId);

        // Plan storage quota (server-side): current usage + this file must fit
        // the user's plan. Existing files are never deleted on downgrade.
        entitlementService.assertCanUpload(uploaderId, file.getSize());

        validateFile(file, originalName);

        String storedName = fileStorageService.store(file, originalName);

        // url is NOT NULL — seed it with the (already working) by-name endpoint,
        // then upgrade to the id-based URL once the generated id is known.
        String byNameUrl = "/api/attachments/by-name/" + storedName + "/download";
        FileAttachment attachment = attachmentRepository.save(FileAttachment.builder()
                .uploaderId(uploaderId)
                .projectId(effectiveProjectId)
                .contextType(context)
                .contextId(contextId)
                .originalName(originalName)
                .storedName(storedName)
                .contentType(file.getContentType())
                .size(file.getSize())
                .url(byNameUrl)
                .build());
        // Downloads go through the authenticated endpoint — never a public /uploads URL.
        String url = "/api/attachments/" + attachment.getId() + "/download";
        attachment.setUrl(url);
        attachmentRepository.save(attachment);
        activityService.record(uploaderId, effectiveProjectId, ActivityType.FILE_UPLOADED,
                "File uploaded", originalName, url);
        return toResponse(attachment, userRepository.findById(uploaderId).orElse(null));
    }

    /**
     * Verifies the caller may upload into the given context and returns the
     * effective project id (or null for DM/feed contexts). The client-supplied
     * projectId is only accepted when it matches the server-derived project.
     *
     * <ul>
     *   <li>MESSAGE {@code room_<id>} or {@code <id>}: caller must be a room participant;
     *       if the room belongs to a project, the caller must be a member and the
     *       project must exist and be active.</li>
     *   <li>MESSAGE {@code dm_<userId>}: target must be a real user, not the caller.</li>
     *   <li>POST / FEED_COMMENT: only the author (or an admin) may attach files.</li>
     *   <li>TASK_COMMENT: task must belong to a project the caller is a member of.</li>
     * </ul>
     */
    private String authorizeUpload(String uploaderId, boolean isAdmin, AttachmentContext context,
                                   String contextId, String suppliedProjectId) {
        if (contextId == null || contextId.isBlank()) {
            throw new IllegalArgumentException("contextId is required");
        }
        return switch (context) {
            case MESSAGE -> authorizeMessageUpload(uploaderId, isAdmin, contextId, suppliedProjectId);
            case POST -> authorizePostUpload(uploaderId, isAdmin, contextId, suppliedProjectId);
            case FEED_COMMENT -> authorizeCommentUpload(uploaderId, isAdmin, contextId, suppliedProjectId);
            case TASK_COMMENT -> authorizeTaskCommentUpload(uploaderId, isAdmin, contextId, suppliedProjectId);
        };
    }

    private String authorizeMessageUpload(String uploaderId, boolean isAdmin, String contextId,
                                          String suppliedProjectId) {
        String roomId = null;
        String otherUserId = null;
        String raw = contextId;
        if (raw.startsWith("room_")) {
            roomId = raw.substring("room_".length());
        } else if (raw.startsWith("dm_")) {
            otherUserId = raw.substring("dm_".length());
        } else {
            roomId = raw; // workspace Files tab passes the raw room id
        }

        if (roomId != null && !roomId.isBlank()) {
            String resolvedRoomId = roomId;
            TeamRoom room = roomRepository.findById(resolvedRoomId)
                    .orElseThrow(() -> new ResourceNotFoundException("Room", resolvedRoomId));
            if (!isAdmin && !participantRepository.existsByRoomIdAndUserId(resolvedRoomId, uploaderId)) {
                throw new AccessDeniedException("You are not a participant in this room");
            }
            if (room.getProjectId() == null) {
                rejectProjectMismatch(suppliedProjectId, null);
                return null;
            }
            Project project = requireActiveProject(room.getProjectId());
            if (!isAdmin && !projectMemberRepository.existsByProjectIdAndUserId(project.getId(), uploaderId)) {
                throw new AccessDeniedException("You are not a member of this project");
            }
            rejectProjectMismatch(suppliedProjectId, project.getId());
            return project.getId();
        }

        if (otherUserId != null && !otherUserId.isBlank()) {
            if (otherUserId.equals(uploaderId)) {
                throw new IllegalArgumentException("Cannot attach a file to a conversation with yourself");
            }
            String resolvedOtherUserId = otherUserId;
            userRepository.findById(resolvedOtherUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", resolvedOtherUserId));
            rejectProjectMismatch(suppliedProjectId, null);
            return null;
        }

        throw new IllegalArgumentException("Invalid message context: " + contextId);
    }

    private String authorizePostUpload(String uploaderId, boolean isAdmin, String contextId,
                                       String suppliedProjectId) {
        Post post = postRepository.findById(contextId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", contextId));
        if (!isAdmin && !uploaderId.equals(post.getUserId())) {
            throw new AccessDeniedException("Only the post author can attach files");
        }
        rejectProjectMismatch(suppliedProjectId, null);
        return null;
    }

    private String authorizeCommentUpload(String uploaderId, boolean isAdmin, String contextId,
                                          String suppliedProjectId) {
        Comment comment = commentRepository.findById(contextId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", contextId));
        if (!isAdmin && !uploaderId.equals(comment.getUserId())) {
            throw new AccessDeniedException("Only the comment author can attach files");
        }
        rejectProjectMismatch(suppliedProjectId, null);
        return null;
    }

    private String authorizeTaskCommentUpload(String uploaderId, boolean isAdmin, String contextId,
                                              String suppliedProjectId) {
        Task task = taskRepository.findById(contextId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", contextId));
        Board board = boardRepository.findById(task.getBoardId())
                .orElseThrow(() -> new ResourceNotFoundException("Board", task.getBoardId()));
        Project project = requireActiveProject(board.getProjectId());
        if (!isAdmin && !projectMemberRepository.existsByProjectIdAndUserId(project.getId(), uploaderId)) {
            throw new AccessDeniedException("You are not a member of this project");
        }
        rejectProjectMismatch(suppliedProjectId, project.getId());
        return project.getId();
    }

    private Project requireActiveProject(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (project.isDeleted()) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
            throw new IllegalArgumentException("This project is archived and file uploads are disabled");
        }
        return project;
    }

    private void rejectProjectMismatch(String supplied, String derived) {
        if (supplied != null && !supplied.isBlank() && !supplied.equals(derived)) {
            throw new IllegalArgumentException("projectId does not match the upload context");
        }
    }

    /**
     * Authorized download. Every request must be authenticated and the caller must
     * be a member of the attachment's project (or a global ADMIN, or — for DM
     * attachments with no project — a participant in the conversation).
     *
     * @throws ResourceNotFoundException if the attachment does not exist
     * @throws AccessDeniedException     if the caller is authenticated but not entitled
     */
    @Transactional(readOnly = true)
    public AttachmentDownload download(String attachmentId, String userId, boolean isAdmin) {
        if (attachmentId == null || attachmentId.isBlank()) {
            throw new ResourceNotFoundException("Attachment", "");
        }
        FileAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        ensureCanAccess(attachment, userId, isAdmin);

        Path path = fileStorageService.resolve(attachment.getStoredName());
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Attachment", attachmentId);
        }
        Resource resource = new FileSystemResource(path);
        MediaType mediaType = safeMediaType(attachment.getContentType());
        return new AttachmentDownload(resource, mediaType, attachment.getOriginalName(), attachment.getSize());
    }

    /**
     * Legacy download by stored name, for records created before the authenticated
     * endpoint existed. Same authorization rules as {@link #download(String, String, boolean)}.
     */
    @Transactional(readOnly = true)
    public AttachmentDownload downloadByStoredName(String storedName, String userId, boolean isAdmin) {
        FileAttachment attachment = attachmentRepository.findByStoredName(storedName)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", storedName));
        return download(attachment.getId(), userId, isAdmin);
    }

    private void ensureCanAccess(FileAttachment attachment, String userId, boolean isAdmin) {
        if (isAdmin || userId.equals(attachment.getUploaderId())) {
            return;
        }
        if (attachment.getProjectId() != null) {
            if (projectMemberRepository.existsByProjectIdAndUserId(attachment.getProjectId(), userId)) {
                return;
            }
        } else if (attachment.getContextType() == AttachmentContext.MESSAGE
                && attachment.getContextId() != null) {
            // DM attachment: only the sender and the receiver may download it.
            boolean participant = messageRepository.findByAttachmentId(attachment.getId()).stream()
                    .anyMatch(m -> userId.equals(m.getSenderId()) || userId.equals(m.getReceiverId()));
            if (participant) {
                return;
            }
        }
        throw new AccessDeniedException("You don't have permission to access this attachment");
    }

    /**
     * Never reflect a client-supplied content type blindly — fall back to a safe
     * application/octet-stream so browsers don't sniff and execute stored files.
     */
    private MediaType safeMediaType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(contentType);
        } catch (Exception e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    public record AttachmentDownload(Resource resource, MediaType mediaType, String originalName, long size) {}

    @Transactional(readOnly = true)
    public List<AttachmentResponse> listByContext(String contextType, String contextId, String userId, boolean isAdmin) {
        AttachmentContext context = parseContext(contextType);
        List<FileAttachment> attachments =
                attachmentRepository.findByContextTypeAndContextId(context.name(), contextId);
        if (attachments.isEmpty()) return List.of();
        // Authorization: only return attachments the caller may download.
        attachments = attachments.stream()
                .filter(a -> canAccess(a, userId, isAdmin))
                .toList();
        if (attachments.isEmpty()) return List.of();
        Set<String> userIds = attachments.stream().map(FileAttachment::getUploaderId).collect(Collectors.toSet());
        Map<String, User> userMap = userIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        return attachments.stream()
                .map(a -> toResponse(a, userMap.get(a.getUploaderId())))
                .collect(Collectors.toList());
    }

    /**
     * All files shared inside a project (message attachments and similar), for
     * the workspace Files tab. Only project members (or admins) may list them —
     * never an arbitrary authenticated user.
     */
    @Transactional(readOnly = true)
    public List<AttachmentResponse> listByProject(String projectId, String userId, boolean isAdmin) {
        if (!isAdmin && !projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new AccessDeniedException("You don't have permission to view these files");
        }
        List<FileAttachment> attachments = attachmentRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        if (attachments.isEmpty()) return List.of();

        Set<String> uploaderIds = attachments.stream().map(FileAttachment::getUploaderId).collect(Collectors.toSet());
        Map<String, User> userMap = uploaderIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(uploaderIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        return attachments.stream()
                .map(a -> toResponse(a, userMap.get(a.getUploaderId())))
                .toList();
    }

    private boolean canAccess(FileAttachment attachment, String userId, boolean isAdmin) {
        try {
            ensureCanAccess(attachment, userId, isAdmin);
            return true;
        } catch (AccessDeniedException | ResourceNotFoundException e) {
            return false;
        }
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

    /**
     * True when the attachment exists and was uploaded by the given user.
     * Used by MessageService to stop a message referencing another user's file.
     */
    public boolean isUploader(String attachmentId, String userId) {
        if (attachmentId == null || userId == null) return false;
        return attachmentRepository.findById(attachmentId)
                .map(a -> userId.equals(a.getUploaderId()))
                .orElse(false);
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

    /**
     * Validates an upload by extension (exact match) AND by sniffing the leading
     * bytes of the content. Client-supplied MIME types are never trusted on their
     * own: a file that claims an image/pdf/office extension but contains executable
     * or unrelated bytes is rejected. Executable signatures are always rejected.
     */
    private void validateFile(MultipartFile file, String fileName) {
        String lower = fileName.toLowerCase();
        int dot = lower.lastIndexOf('.');
        String ext = dot >= 0 ? lower.substring(dot + 1) : "";
        if (!IMAGE_EXTENSIONS.contains(ext) && !DOC_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Unsupported file type: " + ext
                    + ". Allowed: images, pdf, docx, txt, md, zip, xlsx, csv");
        }

        byte[] head = sniff(file);
        if (head == null || head.length == 0) return; // nothing to verify against

        String detected = detectBinary(head);
        if (detected.equals("EXECUTABLE")) {
            throw new IllegalArgumentException("Executable files are not allowed");
        }

        String expected = expectedSignature(ext);
        if (expected.equals("TEXT")) {
            if (containsNul(head)) {
                throw new IllegalArgumentException("File content does not match its ." + ext + " extension");
            }
            return;
        }
        if (!expected.equals(detected)) {
            throw new IllegalArgumentException("File content does not match its ." + ext + " extension");
        }
    }

    private byte[] sniff(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            byte[] buffer = new byte[SNIFF_LENGTH];
            int read = in.read(buffer);
            if (read <= 0) return new byte[0];
            byte[] head = new byte[read];
            System.arraycopy(buffer, 0, head, 0, read);
            return head;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read uploaded file", e);
        }
    }

    /** Returns the binary signature family, or EXECUTABLE/TEXT. */
    private String detectBinary(byte[] head) {
        if (startsWith(head, SIG_MZ) || startsWith(head, SIG_ELF) || (head.length > 0 && head[0] == '#' && head.length > 1 && head[1] == '!')) {
            return "EXECUTABLE";
        }
        if (startsWith(head, SIG_PNG)) return "PNG";
        if (startsWith(head, SIG_JPEG)) return "JPEG";
        if (startsWith(head, SIG_GIF)) return "GIF";
        if (startsWith(head, SIG_BMP)) return "BMP";
        if (startsWith(head, SIG_PDF)) return "PDF";
        if (startsWith(head, SIG_ZIP)) return "ZIP";
        if (startsWith(head, SIG_OLE)) return "OLE";
        if (head.length >= 12 && startsWith(head, "RIFF") && startsWith(head, 8, "WEBP")) return "WEBP";
        if (containsNul(head)) return "BINARY";
        return "TEXT";
    }

    /** Maps an extension to its expected signature family (TEXT = no binary magic). */
    private String expectedSignature(String ext) {
        return switch (ext) {
            case "png" -> "PNG";
            case "jpg", "jpeg" -> "JPEG";
            case "gif" -> "GIF";
            case "webp" -> "WEBP";
            case "bmp" -> "BMP";
            case "pdf" -> "PDF";
            case "zip", "docx", "xlsx" -> "ZIP";
            case "doc", "xls" -> "OLE";
            default -> "TEXT"; // svg, txt, md, csv
        };
    }

    private boolean startsWith(byte[] head, byte[] sig) {
        if (head.length < sig.length) return false;
        for (int i = 0; i < sig.length; i++) {
            if (head[i] != sig[i]) return false;
        }
        return true;
    }

    private boolean startsWith(byte[] head, String s) {
        if (head.length < s.length()) return false;
        for (int i = 0; i < s.length(); i++) {
            if (head[i] != (byte) s.charAt(i)) return false;
        }
        return true;
    }

    private boolean startsWith(byte[] head, int offset, String s) {
        if (head.length < offset + s.length()) return false;
        for (int i = 0; i < s.length(); i++) {
            if (head[offset + i] != (byte) s.charAt(i)) return false;
        }
        return true;
    }

    private boolean containsNul(byte[] head) {
        for (byte b : head) {
            if (b == 0) return true;
        }
        return false;
    }
}
