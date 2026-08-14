package com.devsync.attachment;

import com.devsync.activity.ActivityService;
import com.devsync.attachment.dto.AttachmentResponse;
import com.devsync.billing.EntitlementService;
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
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTest {

    @Mock private FileAttachmentRepository attachmentRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private UserRepository userRepository;
    @Mock private ActivityService activityService;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private TeamRoomRepository roomRepository;
    @Mock private TeamRoomParticipantRepository participantRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private EntitlementService entitlementService;

    @TempDir
    Path tempDir;

    private AttachmentService attachmentService;
    private FileStorageService realStorage;
    private int idCounter;

    /** Minimal valid PNG signature: 0x89 P N G 0x0D 0x0A 0x1A 0x0A */
    private static final byte[] PNG_BYTES = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D
    };
    /** DOS MZ executable header. */
    private static final byte[] MZ_BYTES = {'M', 'Z', 0x10, 0x00, 0x03, 0x00};
    /** ZIP local file header. */
    private static final byte[] ZIP_BYTES = {'P', 'K', 0x03, 0x04, 0x14, 0x00};
    /** PDF header. */
    private static final byte[] PDF_BYTES = {'%', 'P', 'D', 'F', '-', '1', '.', '7'};

    @BeforeEach
    void setUp() throws Exception {
        realStorage = new FileStorageService();
        ReflectionTestUtils.setField(realStorage, "uploadDir", tempDir.toString());
        realStorage.init();
        idCounter = 0;

        attachmentService = new AttachmentService(attachmentRepository, realStorage,
                userRepository, activityService, projectMemberRepository, messageRepository,
                projectRepository, roomRepository, participantRepository,
                taskRepository, boardRepository, postRepository, commentRepository, entitlementService);
        ReflectionTestUtils.setField(attachmentService, "maxSize", 10L * 1024 * 1024);
    }

    private MockMultipartFile png(String name) {
        return new MockMultipartFile("file", name, "image/png", PNG_BYTES);
    }

    private void stubSave() {
        when(attachmentRepository.save(any(FileAttachment.class))).thenAnswer(inv -> {
            FileAttachment a = inv.getArgument(0);
            // Mirrors the DB: the id is assigned on insert only — the second
            // save (url upgrade) must keep the same id.
            if (a.getId() == null) {
                a.setId("att-" + (++idCounter));
                a.setCreatedAt(Instant.now());
            }
            return a;
        });
    }

    private void mockUser(String id, String name) {
        User user = new User();
        user.setId(id);
        user.setEmail(id + "@test.dev");
        user.setFullName(name);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
    }

    private void mockProject(String projectId, boolean deleted, boolean archived) {
        Project project = Project.builder().name("Project " + projectId).ownerId("owner").deleted(deleted).build();
        project.setId(projectId);
        if (archived) project.setStatus(Project.ProjectStatus.ARCHIVED);
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
    }

    private void mockActiveProject(String projectId) {
        mockProject(projectId, false, false);
    }

    /**
     * Authorize a message-room upload context: the caller is a room participant,
     * and when the room has a project the caller is a member of an active project.
     */
    private void allowRoom(String contextId, String projectId, String uploaderId) {
        String roomId = contextId.startsWith("room_") ? contextId.substring("room_".length()) : contextId;
        TeamRoom room = TeamRoom.builder().name("Room").projectId(projectId).createdBy("owner").build();
        room.setId(roomId);
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId(roomId, uploaderId)).thenReturn(true);
        if (projectId != null) {
            mockActiveProject(projectId);
            when(projectMemberRepository.existsByProjectIdAndUserId(projectId, uploaderId)).thenReturn(true);
        }
    }

    @Test
    void upload_shouldStore_AndReturnResponse() {
        MockMultipartFile file = png("photo.png");
        allowRoom("room_room1", "p1", "u1");
        mockUser("u1", "Alice");
        stubSave();

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false);

        assertThat(response.getId()).isEqualTo("att-1");
        assertThat(response.getFileName()).isEqualTo("photo.png");
        assertThat(response.getUrl()).isEqualTo("/api/attachments/att-1/download");
        assertThat(response.getContextId()).isEqualTo("room_room1");
        assertThat(response.getProjectId()).isEqualTo("p1");
        verify(activityService).record(eq("u1"), eq("p1"), any(), any(), any(), any());
    }

    @Test
    void upload_shouldReject_WhenEmpty() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_WhenTooLarge() {
        MockMultipartFile file = new MockMultipartFile("file", "big.png", "image/png",
                new byte[20 * 1024 * 1024]);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maximum");
    }

    @Test
    void upload_shouldReject_WhenUnsupportedExtension() {
        allowRoom("room_room1", "p1", "u1");
        MockMultipartFile file = png("virus.exe");

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_SingleCharExtensionThatWasPreviouslyAcceptedBySubstringMatch() {
        // Regression: the old allowlist used String.contains, so "evil.m" passed
        // because "m" appears inside "bmp"/"md". Exact matching must reject it.
        allowRoom("room_room1", "p1", "u1");
        MockMultipartFile file = new MockMultipartFile("file", "evil.m", "text/plain",
                "just some text".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_ExecutableDisguisedAsPng() {
        allowRoom("room_room1", "p1", "u1");
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", MZ_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Executable");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_ExecutableDisguisedAsPdf() {
        allowRoom("room_room1", "p1", "u1");
        MockMultipartFile file = new MockMultipartFile("file", "report.pdf", "application/pdf", MZ_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Executable");
    }

    @Test
    void upload_shouldReject_ContentMismatchingExtension() {
        // PNG bytes claimed as a PDF
        allowRoom("room_room1", "p1", "u1");
        MockMultipartFile file = new MockMultipartFile("file", "report.pdf", "application/pdf", PNG_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_ExecutableBytesClaimedAsText() {
        // Text extension but executable content - caught by the executable check
        // before the extension/content consistency check.
        allowRoom("room_room1", "p1", "u1");
        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", MZ_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Executable");
    }

    @Test
    void upload_shouldAccept_ValidPdf() {
        allowRoom("room_room1", "p1", "u1");
        mockUser("u1", "Alice");
        stubSave();
        MockMultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", PDF_BYTES);

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false);

        assertThat(response.getFileName()).isEqualTo("doc.pdf");
        assertThat(response.getContentType()).isEqualTo("application/pdf");
    }

    @Test
    void upload_shouldAccept_ValidZipContainerForDocx() {
        allowRoom("room_room1", "p1", "u1");
        mockUser("u1", "Alice");
        stubSave();
        MockMultipartFile file = new MockMultipartFile("file", "doc.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ZIP_BYTES);

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false);

        assertThat(response.getFileName()).isEqualTo("doc.docx");
    }

    @Test
    void upload_shouldAccept_PlainTextFile() {
        allowRoom("room_room1", "p1", "u1");
        mockUser("u1", "Alice");
        stubSave();
        MockMultipartFile file = new MockMultipartFile("file", "notes.md", "text/markdown",
                "# Hello\n\nSome **notes**.".getBytes(StandardCharsets.UTF_8));

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "room_room1", "p1", "u1", false);

        assertThat(response.getFileName()).isEqualTo("notes.md");
    }

    // ── Upload authorization ────────────────────────────────────────────

    @Test
    void upload_shouldReject_NonRoomParticipant() {
        TeamRoom room = TeamRoom.builder().name("Room").projectId(null).createdBy("owner").build();
        room.setId("room1");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room1", "u1")).thenReturn(false);

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "room_room1", null, "u1", false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not a participant");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_NonMemberOfRoomProject() {
        TeamRoom room = TeamRoom.builder().name("Room").projectId("p1").createdBy("owner").build();
        room.setId("room1");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room1", "u1")).thenReturn(true);
        mockActiveProject("p1");
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not a member");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_ArchivedProject() {
        TeamRoom room = TeamRoom.builder().name("Room").projectId("p1").createdBy("owner").build();
        room.setId("room1");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room1", "u1")).thenReturn(true);
        mockProject("p1", false, true);

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_DeletedProject() {
        TeamRoom room = TeamRoom.builder().name("Room").projectId("p1").createdBy("owner").build();
        room.setId("room1");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room1", "u1")).thenReturn(true);
        mockProject("p1", true, false);

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "room_room1", "p1", "u1", false))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_UnknownRoom() {
        when(roomRepository.findById("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "room_nope", null, "u1", false))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_ProjectIdMismatch() {
        allowRoom("room_room1", "p1", "u1");

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "room_room1", "p-other", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_ProjectIdOnProjectlessContext() {
        mockUser("u2", "Bob");

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "dm_u2", "p1", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_InvalidMessageContext() {
        // "room_" with an empty id falls through every branch -> invalid context.
        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "room_", null, "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid message context");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldAllow_DmContext() {
        mockUser("u2", "Bob");
        mockUser("u1", "Alice");
        stubSave();

        AttachmentResponse response = attachmentService.upload(png("photo.png"), "MESSAGE", "dm_u2", null, "u1", false);

        assertThat(response.getProjectId()).isNull();
        assertThat(response.getContextId()).isEqualTo("dm_u2");
        verify(activityService).record(eq("u1"), isNull(), any(), any(), any(), any());
    }

    @Test
    void upload_shouldReject_DmSelfConversation() {
        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "dm_u1", null, "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("yourself");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_DmUnknownUser() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "MESSAGE", "dm_ghost", null, "u1", false))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldAllow_GlobalAdmin_InNonMemberRoom() {
        TeamRoom room = TeamRoom.builder().name("Room").projectId("p1").createdBy("owner").build();
        room.setId("room1");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));
        mockActiveProject("p1");
        stubSave();

        AttachmentResponse response = attachmentService.upload(png("photo.png"), "MESSAGE", "room_room1", "p1", "admin1", true);

        assertThat(response.getProjectId()).isEqualTo("p1");
    }

    @Test
    void upload_shouldAllow_TaskComment_ForProjectMember() {
        Task task = Task.builder().title("T").columnId("c1").boardId("b1").position(0).build();
        task.setId("task1");
        Board board = Board.builder().name("Board").projectId("p1").createdBy("owner").build();
        board.setId("b1");
        when(taskRepository.findById("task1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        mockActiveProject("p1");
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(true);
        stubSave();

        AttachmentResponse response = attachmentService.upload(png("photo.png"), "TASK_COMMENT", "task1", "p1", "u1", false);

        assertThat(response.getProjectId()).isEqualTo("p1");
    }

    @Test
    void upload_shouldReject_TaskComment_ForNonMember() {
        Task task = Task.builder().title("T").columnId("c1").boardId("b1").position(0).build();
        task.setId("task1");
        Board board = Board.builder().name("Board").projectId("p1").createdBy("owner").build();
        board.setId("b1");
        when(taskRepository.findById("task1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        mockActiveProject("p1");
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "TASK_COMMENT", "task1", "p1", "u1", false))
                .isInstanceOf(AccessDeniedException.class);
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_TaskComment_ProjectMismatch() {
        Task task = Task.builder().title("T").columnId("c1").boardId("b1").position(0).build();
        task.setId("task1");
        Board board = Board.builder().name("Board").projectId("p1").createdBy("owner").build();
        board.setId("b1");
        when(taskRepository.findById("task1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        mockActiveProject("p1");
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(true);

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "TASK_COMMENT", "task1", "p2", "u1", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldAllow_PostAuthor() {
        Post post = Post.builder().userId("u1").content("hello").build();
        post.setId("post1");
        when(postRepository.findById("post1")).thenReturn(Optional.of(post));
        mockUser("u1", "Alice");
        stubSave();

        AttachmentResponse response = attachmentService.upload(png("photo.png"), "POST", "post1", null, "u1", false);

        assertThat(response.getProjectId()).isNull();
    }

    @Test
    void upload_shouldReject_PostNonAuthor() {
        Post post = Post.builder().userId("u-other").content("hello").build();
        post.setId("post1");
        when(postRepository.findById("post1")).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "POST", "post1", null, "u1", false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("post author");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldAllow_CommentAuthor() {
        Comment comment = Comment.builder().userId("u1").postId("post1").content("nice").build();
        comment.setId("c1");
        when(commentRepository.findById("c1")).thenReturn(Optional.of(comment));
        mockUser("u1", "Alice");
        stubSave();

        AttachmentResponse response = attachmentService.upload(png("photo.png"), "FEED_COMMENT", "c1", null, "u1", false);

        assertThat(response.getProjectId()).isNull();
    }

    @Test
    void upload_shouldReject_CommentNonAuthor() {
        Comment comment = Comment.builder().userId("u-other").postId("post1").content("nice").build();
        comment.setId("c1");
        when(commentRepository.findById("c1")).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "FEED_COMMENT", "c1", null, "u1", false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("comment author");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_UnknownPost() {
        when(postRepository.findById("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attachmentService.upload(png("photo.png"), "POST", "nope", null, "u1", false))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(attachmentRepository, never()).save(any());
    }

    // ── Download authorization ──────────────────────────────────────────

    private FileAttachment projectAttachment(String id, String storedName, String projectId, String uploaderId) {
        FileAttachment a = FileAttachment.builder()
                .uploaderId(uploaderId)
                .projectId(projectId)
                .contextType(com.devsync.attachment.entity.AttachmentContext.MESSAGE)
                .contextId("msg-1")
                .originalName("photo.png")
                .storedName(storedName)
                .contentType("image/png")
                .size(PNG_BYTES.length)
                .build();
        a.setId(id);
        return a;
    }

    @Test
    void download_shouldAllow_ProjectMember() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u-member")).thenReturn(true);

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-1", "u-member", false);

        assertThat(download.resource().getFile()).exists();
        assertThat(download.originalName()).isEqualTo("photo.png");
    }

    @Test
    void download_shouldReject_NonMember() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u-stranger")).thenReturn(false);

        assertThatThrownBy(() -> attachmentService.download("att-1", "u-stranger", false))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void download_shouldAllow_Uploader() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-1", "u-uploader", false);

        assertThat(download.resource().getFile()).exists();
    }

    @Test
    void download_shouldAllow_GlobalAdmin() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-1", "u-admin", true);

        assertThat(download.resource().getFile()).exists();
    }

    @Test
    void download_shouldThrow_WhenAttachmentMissing() {
        when(attachmentRepository.findById("att-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attachmentService.download("att-missing", "u1", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void download_shouldThrow_WhenStoredFileMissing() throws Exception {
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));

        assertThatThrownBy(() -> attachmentService.download("att-1", "u-uploader", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void downloadByStoredName_shouldReject_Traversal() {
        // Traversal input never reaches the filesystem: it is only used as a DB
        // lookup key (records always carry a server-generated stored name), so a
        // traversal attempt yields 404 — same as any unknown name, no info leak.
        when(attachmentRepository.findByStoredName("../../etc/passwd")).thenReturn(Optional.empty());
        when(attachmentRepository.findByStoredName("..%2F..%2Fetc%2Fpasswd")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attachmentService.downloadByStoredName("../../etc/passwd", "u-uploader", false))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> attachmentService.downloadByStoredName("..%2F..%2Fetc%2Fpasswd", "u-uploader", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void download_shouldReject_TraversalThroughStoredName() throws Exception {
        FileAttachment attachment = projectAttachment("att-1", "..%2F..%2Fetc%2Fpasswd", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));

        // %2F stays a literal in the stored name and fails the safe charset check.
        assertThatThrownBy(() -> attachmentService.download("att-1", "u-uploader", false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void download_shouldAllow_DmParticipant() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = FileAttachment.builder()
                .uploaderId("u-alice")
                .projectId(null)
                .contextType(com.devsync.attachment.entity.AttachmentContext.MESSAGE)
                .contextId("msg-1")
                .originalName("photo.png")
                .storedName("abc-photo.png")
                .contentType("image/png")
                .size(PNG_BYTES.length)
                .build();
        attachment.setId("att-dm");
        when(attachmentRepository.findById("att-dm")).thenReturn(Optional.of(attachment));
        Message dm = Message.builder().senderId("u-alice").receiverId("u-bob").build();
        when(messageRepository.findByAttachmentId("att-dm")).thenReturn(List.of(dm));

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-dm", "u-bob", false);

        assertThat(download.resource().getFile()).exists();
    }

    @Test
    void download_shouldReject_DmStranger() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = FileAttachment.builder()
                .uploaderId("u-alice")
                .projectId(null)
                .contextType(com.devsync.attachment.entity.AttachmentContext.MESSAGE)
                .contextId("msg-1")
                .originalName("photo.png")
                .storedName("abc-photo.png")
                .contentType("image/png")
                .size(PNG_BYTES.length)
                .build();
        attachment.setId("att-dm");
        when(attachmentRepository.findById("att-dm")).thenReturn(Optional.of(attachment));
        when(messageRepository.findByAttachmentId("att-dm")).thenReturn(List.of());

        assertThatThrownBy(() -> attachmentService.download("att-dm", "u-mallory", false))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── Message attachment ownership (used by MessageService) ──────────

    @Test
    void isUploader_shouldReturnTrue_ForOwner() {
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u1");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));

        assertThat(attachmentService.isUploader("att-1", "u1")).isTrue();
    }

    @Test
    void isUploader_shouldReturnFalse_ForNonOwner() {
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u1");
        when(attachmentRepository.findById("att-1")).thenReturn(Optional.of(attachment));

        assertThat(attachmentService.isUploader("att-1", "u2")).isFalse();
    }

    @Test
    void isUploader_shouldReturnFalse_WhenMissing() {
        when(attachmentRepository.findById("att-missing")).thenReturn(Optional.empty());

        assertThat(attachmentService.isUploader("att-missing", "u1")).isFalse();
    }
}
